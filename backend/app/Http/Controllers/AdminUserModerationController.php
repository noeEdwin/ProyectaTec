<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserModerationController extends Controller
{
    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $admin = $request->user();

        $adminEmails = array_map(
            'strtolower',
            config('services.proyectatec.admin_emails', [])
        );

        abort_unless(
            $admin->is_active &&
            in_array(strtolower($admin->email), $adminEmails, true),
            403
        );

        abort_if(
            $admin->id === $user->id ||
            in_array(strtolower($user->email), $adminEmails, true),
            403,
            'No se permite moderar cuentas administradoras.'
        );

        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $user->is_active = (bool) $data['is_active'];
        $user->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => $user->is_active
                ? 'Usuario reactivado correctamente.'
                : 'Usuario desactivado correctamente.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'is_active' => $user->is_active,
            ],
        ]);
    }
}
