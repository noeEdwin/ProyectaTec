<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
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

    public function showPublic(Organization $organization): JsonResponse
    {
        abort_unless($organization->approval_status === 'approved', 404);

        $publicFields = $organization->public_fields;
        $legacyOrganization = $publicFields === null;

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'is_organization' => true,
                'name' => $organization->name,
                'description' => $organization->description,
                'website' => $organization->website,
                'location' => $legacyOrganization || in_array('location', $publicFields, true) ? $organization->location : null,
                'image' => $organization->logo_path,
                'image_url' => OrganizationResource::logoUrl($organization->logo_path),
                'classification' => $legacyOrganization || in_array('classification', $publicFields, true)
                    ? trim(($organization->organization_type ?? '').' - '.($organization->sector ?? ''))
                    : '',
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

        return response()->json([
            'organizations' => Organization::query()
                ->where('approval_status', 'pending')
                ->orderBy('created_at')
                ->get(['id', 'name', 'legal_name', 'website', 'organization_type', 'sector', 'email', 'phone', 'location', 'created_at']),
        ]);
    }

    public function reviewApproval(Request $request, Organization $organization): JsonResponse
    {
        abort_unless($this->isPlatformAdmin($request->user()), 403);

        $data = $request->validate([
            'approval_status' => ['required', Rule::in(['approved', 'rejected'])],
            'rejection_reason' => ['required_if:approval_status,rejected', 'nullable', 'string', 'max:1000'],
        ]);
        abort_unless($organization->approval_status === 'pending', 409);
        $organization->update([
            'approval_status' => $data['approval_status'],
            'rejection_reason' => $data['approval_status'] === 'rejected' ? $data['rejection_reason'] : null,
        ]);

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'approval_status' => $organization->approval_status,
            ],
        ]);
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
