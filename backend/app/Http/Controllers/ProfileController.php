<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProfileResource;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

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
        $validated = $request->validate([
            'account_type' => ['sometimes', Rule::in([
                'estudiante', 'academico', 'empleado_organizacion', 'residente_oaxaca',
                'student', 'docente', 'Investigador',
            ])],
            'display_name' => 'required|string|max:255',
            'institution' => ['required_if:account_type,estudiante,academico', 'nullable', 'string', 'max:255'],
            'campus' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:255'],
            'field_of_study' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:255'],
            'semester' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'student_number' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
            'expected_graduation' => ['required_if:account_type,estudiante', 'nullable', 'string', 'max:80'],
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
                'email', 'phone',
            ])],
        ]);

        if (isset($validated['municipality'], $validated['locality']) && $request->input('account_type') === 'residente_oaxaca') {
            $validated['location'] = collect([$validated['locality'], $validated['municipality']])
                ->filter()->implode(', ');
        }

        $user = $request->user();
        $profile = DB::transaction(function () use ($user, $validated) {
            $currentProfile = $user->profile()->first();
            if (! $currentProfile) {
                $accountType = $validated['account_type'] ?? null;
                unset($validated['account_type']);
                $newProfile = Profile::create(['user_id' => $user->id] + $validated);
                if ($accountType !== null && $this->canonicalAccountType($accountType) !== $this->canonicalAccountType($user->account_type)) {
                    $newProfile->update([
                        'pending_affiliation' => ['account_type' => $accountType],
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
            if ($typeChanged) {
                $pendingAffiliation['account_type'] = $accountType;
            }

            if ($pendingAffiliation !== []) {
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

        return response()->json([
            'profiles' => Profile::query()
                ->with('user:id,name,email,account_type')
                ->where('affiliation_status', 'pending')
                ->orderBy('updated_at')
                ->get()
                ->map(fn (Profile $profile) => [
                    'id' => $profile->id,
                    'user_name' => $profile->user->name,
                    'user_email' => $profile->user->email,
                    'account_type' => $profile->user->account_type,
                    'pending_affiliation' => $profile->pending_affiliation,
                    'updated_at' => $profile->updated_at,
                ]),
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

        DB::transaction(function () use ($profile, $data) {
            $pending = $profile->pending_affiliation ?? [];
            $before = $profile->only(array_keys(array_diff_key($pending, ['account_type' => true])));
            if (array_key_exists('account_type', $pending)) {
                $before['account_type'] = $profile->user->account_type;
            }
            $history = $profile->affiliation_history ?? [];
            $history[] = [
                'before' => $before,
                'requested' => $pending,
                'decision' => $data['decision'],
                'reason' => $data['reason'] ?? null,
                'reviewed_at' => now()->toISOString(),
            ];
            $profile->affiliation_history = $history;
            if ($data['decision'] === 'approved') {
                $accountType = $pending['account_type'] ?? null;
                unset($pending['account_type']);
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
                $profile->affiliation_rejection_reason = $data['reason'];
            }
            $profile->pending_affiliation = null;
            $profile->save();
        });

        return response()->json([
            'profile' => (new ProfileResource($profile->fresh()->load('user')))->resolve($request),
            'decision' => $data['decision'],
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
