<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use Illuminate\Http\Request;
use App\Http\Resources\ProfileResource;

class ProfileController extends Controller
{
    public function update(Request $request)
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
        );

        return response()->json([
            'message' => 'Perfil guardado exitosamente',
            'profile' => new ProfileResource($profile)
        ]);
    }
}