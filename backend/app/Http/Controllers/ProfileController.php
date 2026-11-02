<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProfileResource;
use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function showPublic(Profile $profile): JsonResponse
    {
        return response()->json([
            'profile' => [
                'id' => $profile->id,
                'is_organization' => false,
                'display_name' => $profile->display_name,
                'description' => $profile->description,
                'location' => $profile->location,
                'image' => $profile->avatar_path,
                'classification' => trim(
                    ($profile->institution ?? '').' '.
                    ($profile->field_of_study ?? '')
                ),
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

    public function update(Request $request): JsonResponse
    {
        // Diferenciamos los campos opcionales según los criterios de Figma
        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'location' => 'nullable|string|max:255',
            'institution' => 'nullable|string|max:255',
            'field_of_study' => 'nullable|string|max:255',
        ]);

        // Busca por user_id. Si existe lo actualiza, si no, lo crea.
        $profile = Profile::updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        )->load('user');

        return response()->json([
            'message' => 'Perfil guardado exitosamente',
            'profile' => new ProfileResource($profile),
        ]);
    }
}
