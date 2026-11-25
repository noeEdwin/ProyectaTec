<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProfileResource;
use App\Models\Organization;
use App\Models\Profile;
use App\Models\User;
use App\Rules\ValidExpectedGraduation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function showPublic(Profile $profile): JsonResponse
    {
        $publicFields = $profile->public_fields;
        $legacyProfile = $publicFields === null;
        $showInstitution = $legacyProfile || in_array('institution', $publicFields, true);
        $showFieldOfStudy = $legacyProfile || in_array('field_of_study', $publicFields, true);
        $showOrganizationName = ! $legacyProfile && in_array('organization_name', $publicFields, true);
        $showOrganizationArea = ! $legacyProfile && in_array('organization_area', $publicFields, true);
        $showOrganizationPosition = ! $legacyProfile && in_array('organization_position', $publicFields, true);
        $showAcademicRole = ! $legacyProfile && in_array('academic_role', $publicFields, true);
        $showEmail = ! $legacyProfile && in_array('email', $publicFields, true);
        $showPhone = ! $legacyProfile && in_array('phone', $publicFields, true);

        return response()->json([
            'profile' => [
                'id' => $profile->id,
                'is_organization' => false,
                'account_type' => $profile->user?->account_type,
                'display_name' => $profile->display_name,
                'description' => $profile->description,
                'location' => $legacyProfile || in_array('location', $publicFields, true) ? $profile->location : null,
                'image' => $profile->avatar_path,
                'image_url' => $profile->avatar_path ? Storage::disk('public')->url($profile->avatar_path) : null,
                'classification' => trim(
                    ($showInstitution ? ($profile->institution ?? '') : '').' '.
                    ($showFieldOfStudy ? ($profile->field_of_study ?? '') : '').' '.
                    ($showAcademicRole ? ($profile->academic_role ?? '') : '').' '.
                    ($showOrganizationName ? ($profile->organization_name ?? '') : '').' '.
                    ($showOrganizationArea ? ($profile->organization_area ?? '') : '').' '.
                    ($showOrganizationPosition ? ($profile->organization_position ?? '') : '')
                ),
                'interest_areas' => ! $legacyProfile && in_array('interest_areas', $publicFields, true)
                    ? ($profile->interest_areas ?? [])
                    : [],
                ...(! $legacyProfile ? ['contact' => [
                    'email' => $showEmail ? $profile->user?->email : null,
                    'phone' => $showPhone ? $profile->phone : null,
                ]] : []),
            ],
        ]);
    }

    public function showOwn(Request $request): JsonResponse
    {
        $profile = $request->user()->profile()->with('user')->first();

        return response()->json([
            'profile' => $profile
                ? new ProfileResource($profile)
                : null,
        ]);
    }

    /**
     * Obtener el perfil del usuario autenticado.
     * Si el perfil no existe en la BD, retorna los datos básicos del usuario de la sesión.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::where('user_id', $user->id)->first();

        if (! $profile) {
            return response()->json([
                'data' => [
                    'id' => null,
                    'is_organization' => false,
                    'display_name' => $user->name,
                    'description' => '',
                    'phone' => '',
                    'location' => '',
                    'institution' => '',
                    'field_of_study' => '',
                    'interest_areas' => [],
                    'campus' => '',
                    'semester' => '',
                    'student_number' => '',
                    'expected_graduation' => '',
                    'academic_role' => '',
                    'organization_name' => '',
                    'organization_area' => '',
                    'organization_position' => '',
                    'municipality' => '',
                    'locality' => '',
                    'public_fields' => [],
                    'image' => null,
                    'image_url' => null,
                    'contact' => [
                        'phone' => '',
                        'email' => $user->email,
                    ],
                    'classification' => '',
                    'created_at' => null,
                    'email' => $user->email,
                    'account_type' => $user->account_type ?? 'Estudiante / Investigador',
                ],
            ]);
        }

        return response()->json([
            'data' => array_merge(
                (new ProfileResource($profile->load('user')))->resolve($request),
                [
                    'email' => $user->email,
                    'account_type' => $user->account_type ?? 'Estudiante / Investigador',
                ]
            ),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $profile = $request->user()->profile()->first();

        if (! $profile) {
            return response()->json([
                'message' => 'Debes crear tu perfil antes de subir una fotografía.',
            ], 409);
        }

        $request->validate([
            'avatar' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        $path = $request->file('avatar')->store('avatars', 'public');

        if ($path === false) {
            return response()->json(['message' => 'No se pudo guardar la fotografía.'], 500);
        }

        try {
            DB::transaction(function () use ($profile, $path) {
                $profile->avatar_path = $path;

                if (! $profile->save()) {
                    throw new \RuntimeException('No se pudo actualizar la fotografía del perfil.');
                }
            });
        } catch (\Throwable $exception) {
            try {
                Storage::disk('public')->delete($path);
            } catch (\Throwable $cleanupException) {
                report($cleanupException);
            }

            throw $exception;
        }

        return response()->json(['profile' => new ProfileResource($profile->load('user'))]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'account_type' => ['sometimes', Rule::in([
                'estudiante', 'academico', 'empleado_organizacion', 'residente_oaxaca',
                'student', 'docente', 'Investigador',
            ])],
            'display_name' => ['required', 'string', 'max:255', 'regex:/\pL/u', 'regex:/^[^\d]+$/'],
            'email' => ['sometimes', 'required', 'email:rfc,filter', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'institution' => ['required_if:account_type,estudiante,academico', 'nullable', 'string', 'max:255'],
            'request_new_institution' => ['sometimes', 'boolean'],
            'institution_website' => ['nullable', 'url:http,https', 'max:255'],
            'institution_location' => ['nullable', 'string', 'max:255'],
            'institution_email' => ['nullable', 'email:rfc,filter', 'max:255'],
            'affiliation_reason' => ['nullable', 'string', 'max:500'],
            'campus' => ['nullable', 'string', 'max:255'],
            'field_of_study' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:255'],
            'interest_areas' => ['sometimes', 'array', 'max:6'],
            'interest_areas.*' => ['string', 'max:80', 'distinct'],
            'semester' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'student_number' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'expected_graduation' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80', new ValidExpectedGraduation()],
            'academic_role' => ['required_if:account_type,academico', 'nullable', Rule::in(['docente', 'investigador', 'ambos'])],
            'organization_name' => ['required_if:account_type,empleado_organizacion', 'nullable', 'string', 'max:255'],
            'organization_id' => [
                'nullable',
                'integer',
                Rule::exists('organizations', 'id')->where('approval_status', 'approved'),
            ],
            'organization_area' => ['required_if:account_type,empleado_organizacion', 'nullable', 'string', 'max:255'],
            'organization_position' => ['required_if:account_type,empleado_organizacion', 'nullable', 'string', 'max:255'],
            'municipality' => ['required_if:account_type,residente_oaxaca', 'nullable', 'string', 'max:255'],
            'locality' => ['required_if:account_type,residente_oaxaca', 'nullable', 'string', 'max:255'],
            'description' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'location' => 'nullable|string|max:255',
            'public_fields' => 'nullable|array',
            'public_fields.*' => [Rule::in([
                'location', 'institution', 'field_of_study', 'organization_name', 'municipality',
                'locality', 'organization_area', 'organization_position', 'academic_role',
                'email', 'phone', 'interest_areas',
            ])],
        ], [
            'display_name.required' => 'Ingresa tu nombre completo.',
            'display_name.regex' => 'El nombre debe contener letras y no puede incluir números.',
            'email.required' => 'Ingresa un correo electrónico.',
            'email.email' => 'Ingresa un correo electrónico válido.',
            'email.unique' => 'Este correo electrónico ya está registrado.',
            'institution.required_if' => 'Indica tu institución educativa.',
            'institution_email.email' => 'Ingresa un correo institucional válido.',
            'field_of_study.required_if' => 'Indica tu carrera o programa de estudio.',
            'semester.required_if' => 'Selecciona tu semestre actual.',
            'student_number.required_if' => 'Ingresa tu matrícula.',
            'expected_graduation.required_if' => 'Selecciona tu periodo estimado de egreso.',
            'academic_role.required_if' => 'Selecciona tu actividad académica.',
            'organization_name.required_if' => 'Indica tu organización.',
            'organization_area.required_if' => 'Indica tu área o departamento.',
            'organization_position.required_if' => 'Indica tu cargo o puesto.',
            'municipality.required_if' => 'Selecciona tu municipio.',
            'locality.required_if' => 'Indica tu colonia, barrio o comunidad.',
        ]);

        if (isset($validated['email']) && strcasecmp($validated['email'], $user->email) !== 0
            && in_array(strtolower($validated['email']), array_map('strtolower', config('services.proyectatec.admin_emails', [])), true)) {
            throw ValidationException::withMessages(['email' => ['Este correo está reservado para una cuenta administradora existente.']]);
        }

        if (! array_key_exists('location', $validated)
            && isset($validated['municipality'], $validated['locality'])
            && $request->input('account_type') === 'residente_oaxaca') {
            $validated['location'] = collect([$validated['locality'], $validated['municipality']])
                ->filter()->implode(', ');
        }

        $affiliationReason = trim((string) ($validated['affiliation_reason'] ?? ''));
        $requestNewInstitution = ! empty($validated['request_new_institution']);
        $institutionMeta = [
            'website' => $validated['institution_website'] ?? null,
            'location' => $validated['institution_location'] ?? ($validated['location'] ?? null),
            'email' => $validated['institution_email'] ?? null,
        ];
        unset(
            $validated['request_new_institution'],
            $validated['institution_website'],
            $validated['institution_location'],
            $validated['institution_email'],
            $validated['affiliation_reason']
        );

        $requestedPendingInstitution = null;
        if ($requestNewInstitution && filled($validated['institution'] ?? null)) {
            [$institutionOrg, $isApproved] = Organization::resolveOrRequestInstitution(
                $validated['institution'],
                $institutionMeta
            );
            if ($isApproved) {
                $validated['institution'] = $institutionOrg->name;
            } else {
                $requestedPendingInstitution = $institutionOrg;
                unset($validated['institution']);
            }
        }

        $profile = DB::transaction(function () use ($user, $validated, $requestedPendingInstitution, $affiliationReason) {
            $email = $validated['email'] ?? null;
            unset($validated['email']);
            $user->name = $validated['display_name'];
            if ($email !== null) {
                $user->email = $email;
            }
            $user->save();

            $currentProfile = $user->profile()->first();
            if (! $currentProfile) {
                $accountType = $validated['account_type'] ?? null;
                unset($validated['account_type']);
                $newProfile = Profile::create(['user_id' => $user->id] + $validated);
                $newPending = [];
                if ($accountType !== null && $this->canonicalAccountType($accountType) !== $this->canonicalAccountType($user->account_type)) {
                    $newPending['account_type'] = $accountType;
                }
                if ($requestedPendingInstitution !== null) {
                    $newPending['institution'] = $requestedPendingInstitution->name;
                    $newPending['pending_institution_id'] = $requestedPendingInstitution->id;
                }
                if ($newPending !== []) {
                    if ($affiliationReason !== '') {
                        $newPending['reason'] = $affiliationReason;
                    }
                    $newProfile->update([
                        'pending_affiliation' => $newPending,
                        'affiliation_status' => 'pending',
                    ]);
                }
                if ($user->account_type === 'empleado_organizacion' && $newProfile->organization_id !== null) {
                    $user->organizations()->syncWithoutDetaching([
                        $newProfile->organization_id => ['role' => 'member', 'status' => 'active', 'joined_at' => now()],
                    ]);
                }

                return $newProfile;
            }

            $accountType = $validated['account_type'] ?? null;
            unset($validated['account_type']);
            $typeChanged = $accountType !== null
                && $this->canonicalAccountType($accountType) !== $this->canonicalAccountType($user->account_type);

            $affiliationFields = ['institution', 'organization_name', 'organization_id'];
            $pendingAffiliation = $currentProfile->pending_affiliation ?? [];
            foreach ($affiliationFields as $field) {
                if (array_key_exists($field, $validated)
                    && ($typeChanged || filled($currentProfile->{$field})
                        || ($field === 'organization_id' && filled($currentProfile->organization_name)))
                    && $currentProfile->{$field} != $validated[$field]) {
                    $pendingAffiliation[$field] = $validated[$field];
                    unset($validated[$field]);
                }
            }
            if ($requestedPendingInstitution !== null) {
                $pendingAffiliation['institution'] = $requestedPendingInstitution->name;
                $pendingAffiliation['pending_institution_id'] = $requestedPendingInstitution->id;
            }
            if ($typeChanged) {
                $pendingAffiliation['account_type'] = $accountType;
            }
            if ($pendingAffiliation !== [] && $affiliationReason !== '') {
                $pendingAffiliation['reason'] = $affiliationReason;
            }

            if ($pendingAffiliation !== []) {
                if (empty($pendingAffiliation['pending_institution_id'])) {
                    $ownerOrg = null;
                    $orgIdCandidate = $pendingAffiliation['organization_id'] ?? $currentProfile->organization_id;
                    if (! empty($orgIdCandidate)) {
                        $ownerOrg = Organization::find($orgIdCandidate);
                    } else {
                        $instName = $pendingAffiliation['institution'] ?? $validated['institution'] ?? $currentProfile->institution;
                        if (filled($instName)) {
                            $ownerOrg = Organization::query()
                                ->where('approval_status', 'approved')
                                ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim((string) $instName))])
                                ->first();
                        }
                    }

                    if ($ownerOrg && $ownerOrg->memberships()->where('role', 'admin')->where('status', 'active')->exists()) {
                        $pendingAffiliation['target_organization_id'] = $ownerOrg->id;
                        $pendingAffiliation['target_organization_name'] = $ownerOrg->name;
                    }
                }

                $currentProfile->pending_affiliation = $pendingAffiliation;
                $currentProfile->affiliation_status = 'pending';
                $currentProfile->affiliation_rejection_reason = null;
            }
            $currentProfile->fill($validated);
            $currentProfile->save();
            if (! $typeChanged && array_key_exists('organization_id', $validated)
                && $validated['organization_id'] !== null && $user->account_type === 'empleado_organizacion'
                && ! $user->organizationMemberships()->where('organization_id', $validated['organization_id'])->exists()) {
                $user->organizations()->attach($validated['organization_id'], [
                    'role' => 'member', 'status' => 'active', 'joined_at' => now(),
                ]);
            }

            return $currentProfile;
        })->load('user');

        return response()->json([
            'message' => 'Perfil guardado exitosamente',
            'data' => new ProfileResource($profile),
            'profile' => new ProfileResource($profile),
        ]);
    }

    public function pendingAffiliations(Request $request): JsonResponse
    {
        abort_unless($this->isPlatformAdmin($request->user()), 403);

        $pendingOrgIds = Organization::query()
            ->where('approval_status', 'pending')
            ->pluck('id')
            ->all();

        $profiles = Profile::query()
            ->with('user:id,name,email,account_type')
            ->where('affiliation_status', 'pending')
            ->orderBy('updated_at')
            ->get()
            ->filter(function (Profile $profile) use ($pendingOrgIds): bool {
                $pending = $profile->pending_affiliation ?? [];
                if (! empty($pending['target_organization_id'])) {
                    return false;
                }
                $pendingInstitutionId = $pending['pending_institution_id'] ?? null;

                return $pendingInstitutionId === null || ! in_array((int) $pendingInstitutionId, $pendingOrgIds, true);
            })
            ->values()
            ->map(fn (Profile $profile) => [
                'id' => $profile->id,
                'user_name' => $profile->user->name,
                'user_email' => $profile->user->email,
                'account_type' => $profile->user->account_type,
                'current_institution' => $profile->institution,
                'current_organization_name' => $profile->organization_name,
                'pending_affiliation' => $profile->pending_affiliation,
                'updated_at' => $profile->updated_at,
            ]);

        return response()->json([
            'profiles' => $profiles,
        ]);
    }

    public function reviewAffiliation(Request $request, Profile $profile): JsonResponse
    {
        abort_unless($this->isPlatformAdmin($request->user()), 403);
        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:1000'],
        ]);

        abort_unless($profile->affiliation_status === 'pending' && filled($profile->pending_affiliation), 409);

        self::applyAffiliationDecision($profile, $data['decision'], $data['reason'] ?? null);

        return response()->json([
            'profile' => (new ProfileResource($profile->fresh()->load('user')))->resolve($request),
            'decision' => $data['decision'],
        ]);
    }

    public static function applyAffiliationDecision(Profile $profile, string $decision, ?string $reason = null): void
    {
        DB::transaction(function () use ($profile, $decision, $reason) {
            $pending = $profile->pending_affiliation ?? [];
            $before = $profile->only(array_keys(array_diff_key($pending, [
                'account_type' => true,
                'reason' => true,
                'pending_institution_id' => true,
                'target_organization_id' => true,
                'target_organization_name' => true,
            ])));
            if (array_key_exists('account_type', $pending)) {
                $before['account_type'] = $profile->user->account_type;
            }
            $history = $profile->affiliation_history ?? [];
            $history[] = [
                'before' => $before,
                'requested' => $pending,
                'decision' => $decision,
                'reason' => $reason,
                'reviewed_at' => now()->toISOString(),
            ];
            $profile->affiliation_history = $history;
            if ($decision === 'approved') {
                $accountType = $pending['account_type'] ?? null;
                unset(
                    $pending['account_type'],
                    $pending['reason'],
                    $pending['pending_institution_id'],
                    $pending['target_organization_id'],
                    $pending['target_organization_name']
                );
                $oldOrganizationId = $profile->organization_id;
                $newOrganizationId = array_key_exists('organization_id', $pending)
                    ? $pending['organization_id']
                    : $oldOrganizationId;
                $profile->fill($pending);
                $profile->affiliation_status = 'current';
                if ($accountType !== null) {
                    $profile->user()->update(['account_type' => $accountType]);
                }
                $profile->save();

                if ($newOrganizationId !== $oldOrganizationId) {
                    $user = $profile->user;
                    if ($oldOrganizationId !== null) {
                        $user->organizationMemberships()
                            ->where('organization_id', $oldOrganizationId)
                            ->where('role', 'member')
                            ->delete();
                    }
                    if ($newOrganizationId !== null) {
                        $membership = $user->organizationMemberships()
                            ->where('organization_id', $newOrganizationId)
                            ->first();
                        if (! $membership) {
                            $user->organizations()->attach($newOrganizationId, [
                                'role' => 'member', 'status' => 'active', 'joined_at' => now(),
                            ]);
                        } elseif ($membership->role !== 'admin') {
                            $membership->update(['role' => 'member', 'status' => 'active', 'joined_at' => now()]);
                        }
                    }
                }
            } else {
                $profile->affiliation_status = 'rejected';
                $profile->affiliation_rejection_reason = $reason;
            }
            $profile->pending_affiliation = null;
            $profile->save();
        });
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
        ], [
            'current_password.required' => 'Ingresa tu contraseña actual.',
            'current_password.current_password' => 'La contraseña actual es incorrecta.',
            'password.required' => 'Ingresa una nueva contraseña.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'password.mixed' => 'La contraseña debe incluir al menos una letra mayúscula y una minúscula.',
            'password.numbers' => 'La contraseña debe incluir al menos un número.',
            'password.symbols' => 'La contraseña debe incluir al menos un símbolo especial.',
        ]);

        $request->user()->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        return response()->json([
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }

    private function isPlatformAdmin(User $user): bool
    {
        $administrators = array_map('strtolower', config('services.proyectatec.admin_emails', []));

        return in_array(strtolower($user->email), $administrators, true);
    }

    private function canonicalAccountType(string $type): string
    {
        return match (strtolower($type)) {
            'student' => 'estudiante',
            'docente', 'investigador' => 'academico',
            'employee' => 'empleado_organizacion',
            'resident' => 'residente_oaxaca',
            default => strtolower($type),
        };
    }
}
