<?php

namespace App\Http\Controllers;

use App\Models\PublicationReport;
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

    public function show(Request $request, User $user): JsonResponse
    {
        $this->authorizePlatformAdmin($request);

        $user->load([
            'profile',
            'organizationMemberships.organization:id,name,organization_type,approval_status',
            'createdProjects:id,created_by,title,status,is_hidden,created_at',
            'communityNeeds:id,created_by,title,status,is_hidden,created_at',
        ]);

        $projectIds = $user->createdProjects->pluck('id')->all();
        $needIds = $user->communityNeeds->pluck('id')->all();

        $reportsMadeCount = PublicationReport::query()
            ->where('reporter_id', $user->id)
            ->count();

        $reportsReceivedCount = ($projectIds === [] && $needIds === [])
            ? 0
            : PublicationReport::query()
                ->where(function ($query) use ($projectIds, $needIds) {
                    if ($projectIds !== []) {
                        $query->orWhereIn('project_id', $projectIds);
                    }
                    if ($needIds !== []) {
                        $query->orWhereIn('community_need_id', $needIds);
                    }
                })
                ->count();

        $profile = $user->profile;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'account_type' => $user->account_type ?? 'residente_oaxaca',
                'is_active' => (bool) $user->is_active,
                'created_at' => optional($user->created_at)->toISOString() ?? now()->toISOString(),
                'profile' => $profile ? [
                    'display_name' => $profile->display_name,
                    'description' => $profile->description,
                    'phone' => $profile->phone,
                    'location' => $profile->location,
                    'institution' => $profile->institution,
                    'campus' => $profile->campus,
                    'field_of_study' => $profile->field_of_study,
                    'interest_areas' => $profile->interest_areas ?? [],
                    'semester' => $profile->semester,
                    'student_number' => $profile->student_number,
                    'expected_graduation' => $profile->expected_graduation,
                    'academic_role' => $profile->academic_role,
                    'organization_name' => $profile->organization_name,
                    'organization_area' => $profile->organization_area,
                    'organization_position' => $profile->organization_position,
                    'municipality' => $profile->municipality,
                    'locality' => $profile->locality,
                    'affiliation_status' => $profile->affiliation_status,
                ] : null,
                'organizations' => $user->organizationMemberships->map(fn ($m) => [
                    'id' => $m->organization_id,
                    'name' => $m->organization?->name ?? "Organización #{$m->organization_id}",
                    'organization_type' => $m->organization?->organization_type,
                    'approval_status' => $m->organization?->approval_status,
                    'role' => $m->role,
                    'status' => $m->status,
                ])->values(),
                'projects' => $user->createdProjects
                    ->sortByDesc('created_at')
                    ->take(10)
                    ->values()
                    ->map(fn ($p) => [
                        'id' => $p->id,
                        'type' => 'proyecto',
                        'title' => $p->title,
                        'status' => $p->status,
                        'is_hidden' => (bool) $p->is_hidden,
                        'created_at' => optional($p->created_at)->toISOString(),
                    ]),
                'community_needs' => $user->communityNeeds
                    ->sortByDesc('created_at')
                    ->take(10)
                    ->values()
                    ->map(fn ($n) => [
                        'id' => $n->id,
                        'type' => 'necesidad',
                        'title' => $n->title,
                        'status' => $n->status,
                        'is_hidden' => (bool) $n->is_hidden,
                        'created_at' => optional($n->created_at)->toISOString(),
                    ]),
                'stats' => [
                    'projects_count' => count($projectIds),
                    'community_needs_count' => count($needIds),
                    'reports_made_count' => $reportsMadeCount,
                    'reports_received_count' => $reportsReceivedCount,
                ],
            ],
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