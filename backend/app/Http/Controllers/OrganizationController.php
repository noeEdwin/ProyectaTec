<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use Illuminate\Http\Request;
use App\Http\Resources\OrganizationResource;

class OrganizationController extends Controller
{
    public function store(Request $request)
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
            'organization' => new OrganizationResource($organization)
        ], 201);
    }
}