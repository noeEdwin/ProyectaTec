<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class OrganizationController extends Controller
{
    public function showPublic(Organization $organization): JsonResponse
    {
        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'is_organization' => true,
                'name' => $organization->name,
                'description' => $organization->description,
                'location' => $organization->location,
                'image' => $organization->logo_path,
                'classification' => trim(
                    ($organization->organization_type ?? '').' - '.
                    ($organization->sector ?? '')
                ),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // 1. Validamos los campos requeridos para entidades (Empresa, Institución, Social)
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'organization_type' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sector' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'location' => 'nullable|string|max:255',
        ]);

        // 2. Creamos el registro en la tabla 'organizations'
        $organization = Organization::create($validated);

        // 3. Vinculamos al usuario autenticado usando la relación BelongsToMany
        // Esto inserta el registro en 'organization_members' automáticamente
        $request->user()->organizations()->attach($organization->id, [
            'role' => 'admin',       // Le damos el rol de administrador por ser el creador
            'status' => 'active',
            'joined_at' => now(),
        ]);

        return response()->json([
            'message' => 'Organización creada y vinculada exitosamente',
            'organization' => new OrganizationResource($organization),
        ], 201);
    }

    public function update(Request $request, Organization $organization): JsonResponse
    {
        Gate::authorize('update', $organization);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'organization_type' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'sector' => ['sometimes', 'nullable', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if ($validated === []) {
            return response()->json([
                'message' => 'Debes enviar al menos un campo para actualizar.',
            ], 422);
        }

        $organization->update($validated);

        return response()->json([
            'organization' => new OrganizationResource($organization->fresh()),
        ]);
    }
}
