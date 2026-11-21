<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;

class ProjectMemberController extends Controller
{
    public function index(string $project): JsonResponse
    {
        // Solo permite consultar proyectos públicos y visibles.
        $visibleProject = Project::query()
            ->publiclyVisible()
            ->findOrFail($project);

        // Obtiene únicamente participantes y usuarios activos.
        $members = $visibleProject->members()
            ->where('status', 'active')
            ->whereHas('user', function ($query) {
                $query->where('is_active', true);
            })
            ->with('user:id,name')
            ->orderBy('joined_at')
            ->orderBy('id')
            ->paginate(15);

        return response()->json([
            'project_id' => $visibleProject->id,

            'members' => $members->getCollection()
                ->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'user' => [
                            'id' => $member->user->id,
                            'name' => $member->user->name,
                        ],
                        'role' => $member->role,
                        'joined_at' => $member->joined_at
                            ?->toISOString(),
                    ];
                })
                ->values(),

            'meta' => [
                'current_page' => $members->currentPage(),
                'per_page' => $members->perPage(),
                'last_page' => $members->lastPage(),
                'total' => $members->total(),
            ],
        ]);
    }
}
