<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProfileResource;
use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
                'image_url' => $profile->avatar_path ? Storage::disk('public')->url($profile->avatar_path) : null,
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

    public function update(Request $request)
    {
        $user = $request->user(); // Usuario autenticado

        // 1. Validar los datos entrantes
        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'description' => 'nullable|string|max:1000',
            'location' => 'nullable|string|max:255',
            'account_type' => 'nullable|string|max:255',
            // otros campos según corresponda...
        ]);

        // 2. Actualizar los datos de la tabla USERS (correo, nombre, etc.)
        $user->update([
            'name' => $validated['display_name'], // o el campo de nombre que usen en users
            'email' => $validated['email'],
        ]);

        // 3. Actualizar o crear los datos en la tabla PROFILES
        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'display_name' => $validated['display_name'],
                'description' => $validated['description'] ?? null,
                'location' => $validated['location'] ?? null,
                'account_type' => $validated['account_type'] ?? null,
                // Agrega aquí los demás campos específicos de profiles
            ]
        );

        return response()->json([
            'message' => 'Perfil y datos de usuario actualizados correctamente',
            'user' => $user->load('profile')
        ]);
    }
}
