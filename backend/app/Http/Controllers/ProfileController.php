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
                    'image' => null,
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

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'location' => 'nullable|string|max:255',
            'institution' => 'nullable|string|max:255',
            'field_of_study' => 'nullable|string|max:255',
        ]);

        $profile = Profile::updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        )->load('user');

        return response()->json([
            'message' => 'Perfil guardado exitosamente',
            'data' => new ProfileResource($profile),
            'profile' => new ProfileResource($profile),
        ]);
    }
}
