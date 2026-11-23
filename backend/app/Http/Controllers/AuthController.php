<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\User;
use App\Notifications\WelcomeRegisteredNotification;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required', 'string', 'email', 'max:255', 'unique:users',
            ],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
            'account_type' => ['required', 'string', Rule::in([
                'estudiante', 'academico', 'empleado_organizacion', 'residente_oaxaca', 'organizacion',
                // Valores históricos aceptados para no bloquear integraciones existentes.
                'student', 'docente', 'empresa', 'institucion_educativa', 'sector_social', 'organization',
            ])],
            'institution' => ['required_if:account_type,estudiante,academico', 'nullable', 'string', 'max:255'],
            'request_new_institution' => ['sometimes', 'boolean'],
            'institution_website' => ['nullable', 'url:http,https', 'max:255'],
            'institution_location' => ['nullable', 'string', 'max:255'],
            'institution_email' => ['nullable', 'email', 'max:255'],
            'campus' => ['nullable', 'string', 'max:255'],
            'field_of_study' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:255'],
            'interest_areas' => ['sometimes', 'array', 'max:6'],
            'interest_areas.*' => ['string', 'max:80', 'distinct'],
            'location' => ['nullable', 'string', 'max:255'],
            'semester' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'student_number' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'expected_graduation' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'academic_role' => ['required_if:account_type,academico', 'nullable', Rule::in(['docente', 'investigador', 'ambos'])],
            'organization_name' => ['required_if:account_type,empleado_organizacion,organizacion', 'nullable', 'string', 'max:255'],
            'organization_id' => [
                'nullable',
                'integer',
                Rule::exists('organizations', 'id')->where('approval_status', 'approved'),
            ],
            'organization_area' => ['required_if:account_type,empleado_organizacion', 'nullable', 'string', 'max:255'],
            'organization_position' => ['required_if:account_type,empleado_organizacion', 'nullable', 'string', 'max:255'],
            'organization_type' => ['required_if:account_type,organizacion', 'nullable', Rule::in(['empresa', 'institucion_educativa', 'sector_social'])],
            'legal_name' => ['required_if:account_type,organizacion', 'nullable', 'string', 'max:255'],
            'website' => ['required_if:account_type,organizacion', 'nullable', 'url:http,https', 'max:255'],
            'organization_sector' => ['required_if:account_type,organizacion', 'nullable', 'string', 'max:255'],
            'organization_email' => ['required_if:account_type,organizacion', 'nullable', 'email', 'max:255'],
            'organization_phone' => ['required_if:account_type,organizacion', 'nullable', 'string', 'max:20'],
            'municipality' => ['required_if:account_type,residente_oaxaca,organizacion', 'nullable', 'string', 'max:255'],
            'locality' => ['required_if:account_type,residente_oaxaca,organizacion', 'nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'public_fields' => ['nullable', 'array'],
            'public_fields.*' => [Rule::in([
                'location', 'institution', 'field_of_study', 'organization_name', 'municipality',
                'locality', 'organization_area', 'organization_position', 'academic_role', 'email', 'phone',
                'interest_areas',
            ])],
            'organization_public_fields' => ['nullable', 'array'],
            'organization_public_fields.*' => [Rule::in(['location', 'email', 'phone', 'classification'])],
        ], [
            'email.unique' => 'Este correo electrónico ya está registrado.',
        ]);

        if (in_array(strtolower($validated['email']), array_map('strtolower', config('services.proyectatec.admin_emails', [])), true)) {
            throw ValidationException::withMessages([
                'email' => ['Este correo electrónico ya está registrado.'],
            ]);
        }

        if ($validated['account_type'] === 'empleado_organizacion' && ! empty($validated['organization_id'])) {
            $validated['organization_name'] = Organization::findOrFail($validated['organization_id'])->name;
        }

        $requestedNewInstitution = null;
        $isAcademicOrStudent = in_array($validated['account_type'], ['estudiante', 'academico', 'student', 'docente'], true);
        if ($isAcademicOrStudent && ! empty($validated['request_new_institution']) && filled($validated['institution'] ?? null)) {
            [$institutionOrg, $isApproved] = Organization::resolveOrRequestInstitution(
                $validated['institution'],
                [
                    'website' => $validated['institution_website'] ?? null,
                    'location' => $validated['institution_location'] ?? ($validated['location'] ?? null),
                    'email' => $validated['institution_email'] ?? null,
                ]
            );
            if ($isApproved) {
                $validated['institution'] = $institutionOrg->name;
            } else {
                $requestedNewInstitution = $institutionOrg;
            }
        }

        $user = DB::transaction(function () use ($validated, $requestedNewInstitution) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'account_type' => $validated['account_type'],
            ]);

            Profile::create([
                'user_id' => $user->id,
                'display_name' => $user->name,
                'institution' => $requestedNewInstitution ? null : ($validated['institution'] ?? null),
                'affiliation_status' => $requestedNewInstitution ? 'pending' : 'current',
                'pending_affiliation' => $requestedNewInstitution ? [
                    'institution' => $requestedNewInstitution->name,
                    'pending_institution_id' => $requestedNewInstitution->id,
                ] : null,
                'campus' => $validated['campus'] ?? null,
                'field_of_study' => $validated['field_of_study'] ?? null,
                'interest_areas' => $validated['interest_areas'] ?? [],
                'semester' => $validated['semester'] ?? null,
                'student_number' => $validated['student_number'] ?? null,
                'expected_graduation' => $validated['expected_graduation'] ?? null,
                'academic_role' => $validated['academic_role'] ?? null,
                'organization_name' => $validated['organization_name'] ?? null,
                'organization_id' => $validated['organization_id'] ?? null,
                'organization_area' => $validated['organization_area'] ?? null,
                'organization_position' => $validated['organization_position'] ?? null,
                'municipality' => $validated['municipality'] ?? null,
                'locality' => $validated['locality'] ?? null,
                'public_fields' => $validated['public_fields'] ?? [],
                'location' => $validated['location'] ?? (collect([$validated['locality'] ?? null, $validated['municipality'] ?? null])
                    ->filter()->implode(', ') ?: null),
                'phone' => $validated['phone'] ?? null,
            ]);

            if ($validated['account_type'] === 'empleado_organizacion' && ! empty($validated['organization_id'])) {
                $user->organizations()->attach($validated['organization_id'], [
                    'role' => 'member',
                    'status' => 'active',
                    'joined_at' => now(),
                ]);
            }

            if ($validated['account_type'] === 'organizacion') {
                $organization = Organization::create([
                    'name' => $validated['organization_name'],
                    'legal_name' => $validated['legal_name'],
                    'website' => $validated['website'],
                    'organization_type' => $validated['organization_type'],
                    'sector' => $validated['organization_sector'],
                    'email' => $validated['organization_email'],
                    'phone' => $validated['organization_phone'],
                    'location' => collect([$validated['locality'], $validated['municipality']])
                        ->filter()->implode(', '),
                    'public_fields' => $validated['organization_public_fields'] ?? [],
                    'approval_status' => 'pending',
                ]);
                $user->organizations()->attach($organization->id, [
                    'role' => 'admin',
                    'status' => 'active',
                    'joined_at' => now(),
                ]);
            }

            return $user;
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        try {
            $user->notify(new WelcomeRegisteredNotification());
        } catch (\Throwable $exception) {
            Log::warning('No se pudo enviar el correo de bienvenida al registrarse.', [
                'user_id' => $user->id,
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'message' => 'Usuario registrado exitosamente',
            'access_token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

public function login(Request $request)
{
    $request->validate([
        'email' => 'required|string|email',
        'password' => 'required|string',
    ]);

    $user = User::where('email', $request->email)->first();

    if (! $user || ! Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Credenciales inválidas',
        ], 401);
    }

    // Impedir el acceso a cuentas desactivadas
    if (! $user->is_active) {
        return response()->json([
            'message' => 'Esta cuenta está desactivada.',
        ], 403);
    }

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
        'message' => 'Inicio de sesión exitoso',
        'access_token' => $token,
        'token_type' => 'Bearer',
    ]);
}


    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada exitosamente',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        try {
            Password::sendResetLink([
                'email' => strtolower(trim($validated['email'])),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('No se pudo enviar el correo de recuperación de contraseña.', [
                'email' => strtolower(trim($validated['email'])),
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'message' => 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        $status = Password::reset(
            [
                'token' => $validated['token'],
                'email' => strtolower(trim($validated['email'])),
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));

                $user->save();
                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => ['El enlace de recuperación es inválido o ha expirado.'],
            ]);
        }

        return response()->json([
            'message' => 'Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.',
        ]);
    }
}
