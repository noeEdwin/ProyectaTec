<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserModerationController extends Controller
{
    private function authorizePlatformAdmin(Request $request): array
    {
        $admin = $request->user();

        $adminEmails = array_map(
            'strtolower',
            config('services.proyectatec.admin_emails', [])
        );

        abort_unless(
            $admin &&
            $admin->is_active &&
            in_array(strtolower($admin->email), $adminEmails, true),
            403
        );

        return [$admin, $adminEmails];
    }

    public function index(Request $request): JsonResponse
    {
        [$admin, $adminEmails] = $this->authorizePlatformAdmin($request);
        $search = trim((string) $request->query('q', ''));

        $users = User::query()
            ->where('id', '!=', $admin->id)
            ->when(count($adminEmails) > 0, function ($query) use ($adminEmails) {
                $placeholders = implode(',', array_fill(0, count($adminEmails), '?'));
                $query->whereRaw("LOWER(email) NOT IN ({$placeholders})", $adminEmails);
            })
            ->when($search !== '', function ($query) use ($search) {
                $term = '%'.mb_strtolower($search).'%';
                $query->where(function ($q) use ($search, $term) {
                    $q->whereRaw('LOWER(name) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$term]);

                    if (ctype_digit($search)) {
                        $q->orWhere('id', (int) $search);
                    }
                });
            })
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'account_type' => $u->account_type ?? 'residente_oaxaca',
                'is_active' => (bool) $u->is_active,
                'created_at' => optional($u->created_at)->toISOString() ?? now()->toISOString(),
            ]);

        return response()->json([
            'users' => $users,
        ]);
    }

    public function updateStatus(Request $request, User $user): JsonResponse
    {
        [$admin, $adminEmails] = $this->authorizePlatformAdmin($request);

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
                'email' => $user->email,
                'account_type' => $user->account_type ?? 'residente_oaxaca',
                'is_active' => (bool) $user->is_active,
                'created_at' => optional($user->created_at)->toISOString() ?? now()->toISOString(),
            ],
        ]);
    }
}