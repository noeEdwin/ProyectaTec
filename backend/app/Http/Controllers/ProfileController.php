<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;
use App\Http\Resources\ProfileResource;

class ProfileController extends Controller
{
    // 1. Método para obtener el perfil (GET /api/me/profile)
    public function show(Request $request)
    {
        $profile = Profile::where('user_id', $request->user()->id)->first();

        if (!$profile) {
            return response()->json([
                'data' => [
                    'display_name' => $request->user()->name,
                    'description' => '',
                    'phone' => '',
                    'location' => '',
                    'institution' => '',
                    'field_of_study' => '',
                ]
            ]);
        }

        return response()->json([
            'data' => new ProfileResource($profile)
        ]);
    }

    // 2. Método para actualizar o crear el perfil (PATCH / POST)
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

        $profile = Profile::updateOrCreate(
            ['user_id' => $request->user()->id], 
            $validated 
        );

        return response()->json([
            'message' => 'Perfil guardado exitosamente',
            'data'    => new ProfileResource($profile)
        ]);
    }
}