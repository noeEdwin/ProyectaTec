<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;
use App\Http\Resources\ProfileResource;

class ProfileController extends Controller
{
    /**
     * Obtener el perfil del usuario autenticado.
     * Si el perfil no existe en la BD, retorna los datos básicos del usuario de la sesión.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = Profile::where('user_id', $user->id)->first();

        // Si el usuario no tiene fila en la tabla 'profiles', devolver datos iniciales
        if (!$profile) {
            return response()->json([
                'data' => [
                    'display_name'   => $user->name,
                    'description'    => '',
                    'phone'          => '',
                    'location'       => '',
                    'institution'    => '',
                    'field_of_study' => '',
                    'email'          => $user->email,
                    'account_type'   => $user->account_type ?? 'Estudiante / Investigador',
                ]
            ]);
        }

        return response()->json([
            'data' => new ProfileResource($profile)
        ]);
    }

    /**
     * Crear o actualizar el perfil del usuario autenticado.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'display_name'   => 'required|string|max:255',
            'description'    => 'nullable|string',
            'phone'          => 'nullable|string|max:20',
            'location'       => 'nullable|string|max:255',
            'institution'    => 'nullable|string|max:255',
            'field_of_study' => 'nullable|string|max:255',
        ]);

        // Busca por user_id. Si existe lo actualiza, si no, lo inserta en la BD.
        $profile = Profile::updateOrCreate(
            ['user_id' => $request->user()->id], 
            $validated 
        );

        return response()->json([
            'message' => 'Perfil guardado exitosamente',
            'data'    => new ProfileResource($profile),
            'profile' => new ProfileResource($profile)
        ]);
    }
}