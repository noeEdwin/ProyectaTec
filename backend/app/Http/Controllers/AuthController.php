<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
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
            'password' => 'required|string|min:8|confirmed',
            'account_type' => ['required', 'string', Rule::in([
                'estudiante', 'academico', 'empleado_organizacion', 'residente_oaxaca', 'organizacion',
                // Valores históricos aceptados para no bloquear integraciones existentes.
                'student', 'docente', 'empresa', 'institucion_educativa', 'sector_social', 'organization',
            ])],
            'institution' => ['required_if:account_type,estudiante,academico', 'nullable', 'string', 'max:255'],
            'campus' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:255'],
            'field_of_study' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:255'],
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
            ])],
            'organization_public_fields' => ['nullable', 'array'],
            'organization_public_fields.*' => [Rule::in(['location', 'email', 'phone', 'classification'])],
        ]);

        if (in_array(strtolower($validated['email']), array_map('strtolower', config('services.proyectatec.admin_emails', [])), true)) {
            throw ValidationException::withMessages([
                'email' => ['Este correo está reservado para una cuenta administradora existente.'],
            ]);
        }

        if ($validated['account_type'] === 'empleado_organizacion' && ! empty($validated['organization_id'])) {
            $validated['organization_name'] = Organization::findOrFail($validated['organization_id'])->name;
        }

        $user = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'account_type' => $validated['account_type'],
            ]);

            Profile::create([
                'user_id' => $user->id,
                'display_name' => $user->name,
                'institution' => $validated['institution'] ?? null,
                'campus' => $validated['campus'] ?? null,
                'field_of_study' => $validated['field_of_study'] ?? null,
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
                'location' => collect([$validated['locality'] ?? null, $validated['municipality'] ?? null])
                    ->filter()->implode(', ') ?: null,
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
}
