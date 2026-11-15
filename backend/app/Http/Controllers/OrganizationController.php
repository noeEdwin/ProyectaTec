<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrganizationResource;
use App\Http\Resources\ProfileResource;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrganizationController extends Controller
{
    private const ORGANIZATION_TYPES = ['empresa', 'institucion_educativa', 'sector_social'];

    public function publicIndex(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', Rule::in(self::ORGANIZATION_TYPES)],
        ]);

        $search = trim($filters['q'] ?? '');
        $type = $filters['type'] ?? null;

        $organizations = Organization::query()
            ->where('approval_status', 'approved')
            ->when($type !== null, fn ($query) => $query->where('organization_type', $type))
            ->when($search !== '', function ($query) use ($search) {
                $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], mb_strtolower($search));
                $pattern = '%'.$escaped.'%';
                $query->where(function ($sub) use ($pattern) {
                    $sub->whereRaw('LOWER(name) LIKE ?', [$pattern])
                        ->orWhereRaw("LOWER(COALESCE(sector, '')) LIKE ?", [$pattern])
                        ->orWhereRaw("LOWER(COALESCE(location, '')) LIKE ?", [$pattern])
                        ->orWhereRaw("LOWER(COALESCE(description, '')) LIKE ?", [$pattern]);
                });
            })
            ->withCount(['projects' => fn ($query) => $query->publiclyVisible()])
            ->orderByDesc('projects_count')
            ->orderBy('name')
            ->get()
            ->map(function (Organization $organization) {
                $publicFields = $organization->public_fields;
                $legacy = $publicFields === null;

                return [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'organization_type' => $organization->organization_type,
                    'sector' => $organization->sector,
                    'description' => $organization->description,
                    'location' => $legacy || in_array('location', $publicFields, true)
                        ? $organization->location
                        : null,
                    'image_url' => OrganizationResource::logoUrl($organization->logo_path),
                    'projects_count' => $organization->projects_count,
                ];
            });

        return response()->json(['organizations' => $organizations]);
    }

    public function catalog(): JsonResponse
    {
        $organizations = Organization::query()
            ->where('approval_status', 'approved')
            ->orderBy('name')
            ->get(['id', 'name', 'organization_type'])
            ->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'organization_type' => $organization->organization_type,
            ]);

        return response()->json(['organizations' => $organizations]);
    }

    public function indexOwn(Request $request): JsonResponse
    {
        $organizations = $request->user()->organizations()
            ->wherePivot('status', 'active')
            ->get([
                'organizations.id',
                'organizations.name',
                'organizations.description',
                'organizations.location',
                'organizations.logo_path',
                'organizations.organization_type',
                'organizations.sector',
                'organizations.approval_status',
                'organizations.rejection_reason',
                'organizations.email',
                'organizations.phone',
                'organizations.public_fields',
                'organizations.legal_name',
                'organizations.website',
            ])
            ->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'organization_type' => $organization->organization_type,
                'description' => $organization->description,
                'sector' => $organization->sector,
                'location' => $organization->location,
                'image' => $organization->logo_path,
                'image_url' => OrganizationResource::logoUrl($organization->logo_path),
                'classification' => trim(
                    ($organization->organization_type ?? '').' - '.($organization->sector ?? '')
                ),
                'role' => $organization->pivot->role,
                'status' => $organization->pivot->status,
                'can_update' => $organization->pivot->role === 'admin'
                    && $organization->pivot->status === 'active',
                'approval_status' => $organization->approval_status,
                'rejection_reason' => $organization->rejection_reason,
                ...($organization->pivot->role === 'admin' ? [
                    'email' => $organization->email,
                    'phone' => $organization->phone,
                    'public_fields' => $organization->public_fields ?? [],
                    'legal_name' => $organization->legal_name,
                    'website' => $organization->website,
                ] : []),
                'membership' => [
                    'role' => $organization->pivot->role,
                    'status' => $organization->pivot->status,
                    'joined_at' => $organization->pivot->joined_at === null
                        ? null
                        : Carbon::parse($organization->pivot->joined_at)->utc()->toISOString(),
                ],
            ]);

        return response()->json(['organizations' => $organizations]);
    }

    public function myRoleRequests(Request $request): JsonResponse
    {
        $roleRequests = $request->user()->organizationMemberships()
            ->with('organization:id,name,organization_type')
            ->where(fn ($query) => $query->where('status', '!=', 'active')->orWhereNotNull('requested_role'))
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (OrganizationMember $membership) => [
                'id' => $membership->id,
                'organization_id' => $membership->organization_id,
                'organization_name' => $membership->organization?->name ?? 'Organización',
                'role' => $membership->role,
                'requested_role' => $membership->requested_role,
                'status' => $membership->status,
                'request_note' => $membership->request_note,
                'rejection_reason' => $membership->rejection_reason,
                'updated_at' => optional($membership->updated_at)->toISOString(),
            ]);

        return response()->json(['role_requests' => $roleRequests]);
    }

    public function showPublic(Organization $organization): JsonResponse
    {
        abort_unless($organization->approval_status === 'approved', 404);

        $publicFields = $organization->public_fields;
        $legacyOrganization = $publicFields === null;

        $projects = $organization->projects()
            ->publiclyVisible()
            ->with('category:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($project) => [
                'id' => $project->id,
                'title' => $project->title,
                'description' => $project->description,
                'status' => $project->status,
                'modality' => $project->modality,
                'location' => $project->location,
                'cover_image_url' => OrganizationResource::logoUrl($project->cover_image_path),
                'created_at' => optional($project->created_at)->toISOString(),
                'category' => $project->category ? [
                    'id' => $project->category->id,
                    'name' => $project->category->name,
                ] : null,
            ]);

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'is_organization' => true,
                'name' => $organization->name,
                'organization_type' => $organization->organization_type,
                'sector' => $organization->sector,
                'description' => $organization->description,
                'website' => $organization->website,
                'location' => $legacyOrganization || in_array('location', $publicFields, true) ? $organization->location : null,
                'image' => $organization->logo_path,
                'image_url' => OrganizationResource::logoUrl($organization->logo_path),
                'classification' => $legacyOrganization || in_array('classification', $publicFields, true)
                    ? trim(($organization->organization_type ?? '').' - '.($organization->sector ?? ''))
                    : '',
                'projects' => $projects,
                ...(! $legacyOrganization ? ['contact' => [
                    'email' => in_array('email', $publicFields ?? [], true) ? $organization->email : null,
                    'phone' => in_array('phone', $publicFields ?? [], true) ? $organization->phone : null,
                ]] : []),
            ],
        ]);
    }

    public function uploadLogo(Request $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);

        $request->validate([
            'logo' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        $path = $request->file('logo')->store('logos', 'public');

        if ($path === false) {
            return response()->json(['message' => 'No se pudo guardar el logotipo.'], 500);
        }

        try {
            DB::transaction(function () use ($organization, $path) {
                $organization->logo_path = $path;

                if (! $organization->save()) {
                    throw new \RuntimeException('No se pudo actualizar el logotipo de la organización.');
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

        return response()->json(['organization' => new OrganizationResource($organization)]);
    }

    public function store(Request $request): JsonResponse
    {
        // 1. Validamos los campos requeridos para entidades (Empresa, Institución, Social)
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'organization_type' => ['required', 'string', 'max:255', Rule::in(self::ORGANIZATION_TYPES)],
            'legal_name' => ['required', 'string', 'max:255'],
            'website' => ['required', 'url:http,https', 'max:255'],
            'description' => 'nullable|string',
            'sector' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'location' => 'required|string|max:255',
            'public_fields' => 'nullable|array',
            'public_fields.*' => ['string', Rule::in(['location', 'email', 'phone', 'classification'])],
        ]);

        $organization = DB::transaction(function () use ($validated, $request) {
            $organization = Organization::create($validated + ['approval_status' => 'pending']);
            $request->user()->organizations()->attach($organization->id, [
                'role' => 'admin', 'status' => 'active', 'joined_at' => now(),
            ]);

            return $organization;
        });

        return response()->json([
            'message' => 'Organización creada y vinculada exitosamente',
            'organization' => new OrganizationResource($organization),
        ], 201);
    }

    public function pendingApprovals(Request $request): JsonResponse
    {
        abort_unless($this->isPlatformAdmin($request->user()), 403);

        $pendingOrganizations = Organization::query()
            ->with(['memberships.user:id,name,email,account_type'])
            ->where('approval_status', 'pending')
            ->orderBy('created_at')
            ->get();

        $pendingOrgIds = $pendingOrganizations->pluck('id')->all();
        $institutionApplicants = $pendingOrgIds === []
            ? collect()
            : Profile::query()
                ->with('user:id,name,email,account_type')
                ->where('affiliation_status', 'pending')
                ->get()
                ->filter(fn (Profile $p) => in_array((int) ($p->pending_affiliation['pending_institution_id'] ?? 0), $pendingOrgIds, true))
                ->keyBy(fn (Profile $p) => (int) ($p->pending_affiliation['pending_institution_id'] ?? 0));

        $organizations = $pendingOrganizations->map(function (Organization $organization) use ($institutionApplicants) {
            $memberApplicant = $organization->memberships->first();
            $profileApplicant = $institutionApplicants->get($organization->id);
            $applicantUser = $memberApplicant?->user ?? $profileApplicant?->user;

            return [
                'id' => $organization->id,
                'name' => $organization->name,
                'legal_name' => $organization->legal_name,
                'website' => $organization->website,
                'organization_type' => $organization->organization_type,
                'sector' => $organization->sector,
                'email' => $organization->email,
                'phone' => $organization->phone,
                'location' => $organization->location,
                'description' => $organization->description,
                'public_fields' => $organization->public_fields ?? [],
                'logo_url' => $organization->logo_path ? asset('storage/'.$organization->logo_path) : null,
                'members_count' => $organization->memberships->count(),
                'applicant' => $applicantUser ? [
                    'id' => $applicantUser->id,
                    'name' => $applicantUser->name,
                    'email' => $applicantUser->email,
                    'account_type' => $applicantUser->account_type,
                ] : null,
                'created_at' => $organization->created_at,
            ];
        });

        $ownershipRequests = OrganizationMember::query()
            ->with(['user:id,name,email,account_type', 'organization:id,name,organization_type,location,approval_status'])
            ->where('requested_role', 'admin')
            ->whereHas('organization', fn ($q) => $q->where('approval_status', 'approved'))
            ->where(function ($q) {
                $q->where('status', 'pending')->orWhere('role', '!=', 'admin');
            })
            ->orderBy('updated_at')
            ->get()
            ->filter(fn (OrganizationMember $m) => $m->organization
                && ! $m->organization->memberships()->where('role', 'admin')->where('status', 'active')->exists())
            ->values()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'organization_id' => $m->organization_id,
                'organization_name' => $m->organization->name,
                'organization_type' => $m->organization->organization_type,
                'organization_location' => $m->organization->location,
                'user_id' => $m->user_id,
                'user_name' => $m->user?->name ?? 'Usuario',
                'user_email' => $m->user?->email ?? '',
                'account_type' => $m->user?->account_type ?? '',
                'request_note' => $m->request_note,
                'created_at' => optional($m->updated_at ?? $m->created_at)->toISOString(),
            ]);

        return response()->json([
            'organizations' => $organizations,
            'ownership_requests' => $ownershipRequests,
        ]);
    }

    public function adminCreate(Request $request): JsonResponse
    {
        abort_unless($this->isPlatformAdmin($request->user()), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'organization_type' => ['sometimes', 'string', Rule::in(self::ORGANIZATION_TYPES)],
            'sector' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'website' => ['nullable', 'url:http,https', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $normalizedName = trim($validated['name']);
        $type = $validated['organization_type'] ?? 'institucion_educativa';
        $existing = Organization::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($normalizedName)])
            ->first();

        if ($existing && $existing->approval_status === 'approved') {
            throw ValidationException::withMessages([
                'name' => ['Ya existe una organización o institución verificada con ese nombre.'],
            ]);
        }

        $organization = DB::transaction(function () use ($existing, $normalizedName, $type, $validated) {
            $payload = [
                'name' => $normalizedName,
                'organization_type' => $type,
                'sector' => $validated['sector'] ?? ($type === 'institucion_educativa' ? 'Educación y capacitación' : null),
                'location' => $validated['location'] ?? null,
                'website' => $validated['website'] ?? null,
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'legal_name' => $validated['legal_name'] ?? null,
                'description' => $validated['description'] ?? null,
                'approval_status' => 'approved',
                'rejection_reason' => null,
            ];

            if ($existing) {
                $existing->update($payload);
                $organization = $existing->fresh();
            } else {
                $organization = Organization::create($payload);
            }

            $this->resolvePendingInstitutionProfiles($organization, 'approved', null);

            return $organization;
        });

        return response()->json([
            'message' => 'Institución u organización agregada y verificada correctamente.',
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'organization_type' => $organization->organization_type,
                'approval_status' => $organization->approval_status,
            ],
        ], 201);
    }

    public function reviewApproval(Request $request, Organization $organization): JsonResponse
    {
        abort_unless($this->isPlatformAdmin($request->user()), 403);

        $data = $request->validate([
            'approval_status' => ['required', Rule::in(['approved', 'rejected'])],
            'rejection_reason' => ['required_if:approval_status,rejected', 'nullable', 'string', 'max:1000'],
        ]);
        abort_unless($organization->approval_status === 'pending', 409);

        DB::transaction(function () use ($organization, $data) {
            $organization->update([
                'approval_status' => $data['approval_status'],
                'rejection_reason' => $data['approval_status'] === 'rejected' ? $data['rejection_reason'] : null,
            ]);

            $this->resolvePendingInstitutionProfiles(
                $organization,
                $data['approval_status'],
                $data['rejection_reason'] ?? null
            );
        });

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'approval_status' => $organization->approval_status,
            ],
        ]);
    }

    public function requestRole(Request $request, Organization $organization): JsonResponse
    {
        abort_unless($organization->approval_status === 'approved', 404);

        $data = $request->validate([
            'role' => ['required', Rule::in(['member', 'admin'])],
            'note' => [
                Rule::requiredIf(fn () => $request->input('role') === 'admin'),
                'nullable',
                'string',
                'max:500',
            ],
        ]);

        $user = $request->user();
        $existing = $organization->memberships()->where('user_id', $user->id)->first();

        if ($existing && $existing->status === 'active') {
            if ($existing->role === 'admin') {
                return response()->json(['message' => 'Ya eres administrador de esta organización.'], 409);
            }
            if ($data['role'] === 'member') {
                return response()->json(['message' => 'Ya formas parte activa de esta organización.'], 409);
            }

            $existing->update([
                'requested_role' => 'admin',
                'request_note' => $data['note'] ?? null,
                'rejection_reason' => null,
            ]);
            $membership = $existing->fresh();
        } elseif ($existing) {
            $existing->update([
                'status' => 'pending',
                'requested_role' => $data['role'],
                'request_note' => $data['note'] ?? null,
                'rejection_reason' => null,
            ]);
            $membership = $existing->fresh();
        } else {
            $membership = OrganizationMember::create([
                'organization_id' => $organization->id,
                'user_id' => $user->id,
                'role' => 'member',
                'requested_role' => $data['role'],
                'request_note' => $data['note'] ?? null,
                'status' => 'pending',
            ]);
        }

        return response()->json([
            'message' => 'Solicitud enviada al responsable de la organización para su aprobación.',
            'membership' => [
                'id' => $membership->id,
                'organization_id' => $membership->organization_id,
                'role' => $membership->role,
                'requested_role' => $membership->requested_role,
                'status' => $membership->status,
                'request_note' => $membership->request_note,
            ],
        ], 201);
    }

    public function memberRequests(Request $request, Organization $organization): JsonResponse
    {
        abort_unless($this->canManageMembers($request->user(), $organization), 403);

        $memberships = $organization->memberships()
            ->with('user:id,name,email,account_type')
            ->orderByDesc('updated_at')
            ->get();

        $requests = $memberships
            ->filter(fn (OrganizationMember $m) => $m->status === 'pending' || $m->requested_role !== null)
            ->values()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'user_name' => $m->user?->name ?? 'Usuario',
                'user_email' => $m->user?->email ?? '',
                'account_type' => $m->user?->account_type ?? '',
                'role' => $m->role,
                'requested_role' => $m->requested_role ?? $m->role,
                'status' => $m->status,
                'request_note' => $m->request_note,
                'updated_at' => optional($m->updated_at)->toISOString(),
            ]);

        $members = $memberships
            ->filter(fn (OrganizationMember $m) => $m->status === 'active')
            ->values()
            ->map(fn (OrganizationMember $m) => [
                'id' => $m->id,
                'user_id' => $m->user_id,
                'user_name' => $m->user?->name ?? 'Usuario',
                'user_email' => $m->user?->email ?? '',
                'role' => $m->role,
                'joined_at' => optional($m->joined_at)->toISOString(),
            ]);

        $affiliationRequests = Profile::query()
            ->with('user:id,name,email,account_type')
            ->where('affiliation_status', 'pending')
            ->orderBy('updated_at')
            ->get()
            ->filter(fn (Profile $profile) => (int) ($profile->pending_affiliation['target_organization_id'] ?? 0) === (int) $organization->id)
            ->values()
            ->map(fn (Profile $profile) => [
                'id' => $profile->id,
                'user_name' => $profile->user->name,
                'user_email' => $profile->user->email,
                'account_type' => $profile->user->account_type,
                'current_institution' => $profile->institution,
                'current_organization_name' => $profile->organization_name,
                'pending_affiliation' => collect($profile->pending_affiliation ?? [])
                    ->except(['target_organization_id', 'target_organization_name'])
                    ->all(),
                'updated_at' => $profile->updated_at,
            ]);

        return response()->json([
            'requests' => $requests,
            'members' => $members,
            'affiliation_requests' => $affiliationRequests,
        ]);
    }

    public function reviewAffiliationRequest(
        Request $request,
        Organization $organization,
        Profile $profile
    ): JsonResponse {
        abort_unless($this->canManageMembers($request->user(), $organization), 403);
        abort_unless(
            $profile->affiliation_status === 'pending'
                && (int) ($profile->pending_affiliation['target_organization_id'] ?? 0) === (int) $organization->id,
            404
        );

        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:1000'],
        ]);

        ProfileController::applyAffiliationDecision($profile, $data['decision'], $data['reason'] ?? null);

        return response()->json([
            'profile' => (new ProfileResource($profile->fresh()->load('user')))->resolve($request),
            'decision' => $data['decision'],
        ]);
    }

    public function reviewMemberRequest(
        Request $request,
        Organization $organization,
        OrganizationMember $membership
    ): JsonResponse {
        abort_unless((int) $membership->organization_id === (int) $organization->id, 404);
        abort_unless($this->canManageMembers($request->user(), $organization), 403);
        abort_unless($membership->status === 'pending' || $membership->requested_role !== null, 409);

        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'reason' => ['required_if:decision,rejected', 'nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($organization, $membership, $data) {
            if ($data['decision'] === 'approved') {
                $targetRole = $membership->requested_role ?: $membership->role ?: 'member';
                $membership->update([
                    'role' => $targetRole,
                    'status' => 'active',
                    'requested_role' => null,
                    'rejection_reason' => null,
                    'joined_at' => $membership->joined_at ?? now(),
                ]);

                $profile = $membership->user?->profile;
                if ($profile && $profile->organization_id === null && $membership->user?->account_type === 'empleado_organizacion') {
                    $profile->update([
                        'organization_id' => $organization->id,
                        'organization_name' => $organization->name,
                    ]);
                }
            } else {
                $membership->update([
                    'requested_role' => null,
                    'rejection_reason' => $data['reason'],
                    'status' => $membership->status === 'pending' ? 'rejected' : $membership->status,
                ]);
            }
        });

        return response()->json([
            'decision' => $data['decision'],
            'membership' => [
                'id' => $membership->id,
                'role' => $membership->fresh()->role,
                'status' => $membership->fresh()->status,
                'rejection_reason' => $membership->fresh()->rejection_reason,
            ],
        ]);
    }

    private function canManageMembers(User $user, Organization $organization): bool
    {
        if ($this->isPlatformAdmin($user)) {
            return true;
        }

        return $organization->memberships()
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->where('status', 'active')
            ->exists();
    }

    private function resolvePendingInstitutionProfiles(
        Organization $organization,
        string $decision,
        ?string $reason
    ): void {
        $profiles = Profile::query()
            ->with('user')
            ->where('affiliation_status', 'pending')
            ->get()
            ->filter(fn (Profile $profile) => (int) ($profile->pending_affiliation['pending_institution_id'] ?? 0) === (int) $organization->id);

        foreach ($profiles as $profile) {
            $pending = $profile->pending_affiliation ?? [];
            $before = ['institution' => $profile->institution];
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
                $profile->institution = $organization->name;
                $profile->affiliation_status = 'current';
                $profile->affiliation_rejection_reason = null;
                if (! empty($pending['account_type'])) {
                    $profile->user()->update(['account_type' => $pending['account_type']]);
                }
            } else {
                $profile->affiliation_status = 'rejected';
                $profile->affiliation_rejection_reason = $reason;
            }

            $profile->pending_affiliation = null;
            $profile->save();
        }
    }

    public function resubmit(Request $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);
        abort_unless($organization->approval_status === 'rejected', 409);

        $organization->update(['approval_status' => 'pending', 'rejection_reason' => null]);

        return response()->json(['organization' => [
            'id' => $organization->id,
            'approval_status' => $organization->approval_status,
        ]]);
    }

    private function isPlatformAdmin(User $user): bool
    {
        $administrators = array_map('strtolower', config('services.proyectatec.admin_emails', []));

        return in_array(strtolower($user->email), $administrators, true);
    }

    public function update(Request $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'organization_type' => ['sometimes', 'required', 'string', 'max:255', Rule::in(self::ORGANIZATION_TYPES)],
            'description' => ['sometimes', 'nullable', 'string'],
            'sector' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'public_fields' => ['sometimes', 'array'],
            'public_fields.*' => ['string', Rule::in(['location', 'email', 'phone', 'classification'])],
            'legal_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'website' => ['sometimes', 'nullable', 'url:http,https', 'max:255'],
        ]);

        if ($validated === []) {
            throw ValidationException::withMessages([
                'organization' => ['Debes enviar al menos un campo para actualizar.'],
            ]);
        }

        $organization->update($validated);

        return response()->json([
            'organization' => new OrganizationResource($organization->fresh()),
        ]);
    }
}
