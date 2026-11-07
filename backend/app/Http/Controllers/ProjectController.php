<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\OrganizationMember;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['organization_id'])) {
            $isAdmin = OrganizationMember::query()
                ->where('organization_id', $data['organization_id'])
                ->where('user_id', $request->user()->id)
                ->where('role', 'admin')
                ->where('status', 'active')
                ->whereHas('organization', fn ($query) => $query->where('approval_status', 'approved'))
                ->exists();

            abort_unless($isAdmin, 403);
        }

        $data['created_by'] = $request->user()->id;
        $project = Project::create($data);

        return response()->json(['project' => new ProjectResource($project)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $projects = Project::query()
            ->publiclyVisible()
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'projects' => ProjectResource::collection($projects->items())->resolve($request),
            'meta' => [
                'current_page' => $projects->currentPage(),
                'per_page' => $projects->perPage(),
                'last_page' => $projects->lastPage(),
                'total' => $projects->total(),
            ],
        ]);
    }

    public function show(int $project): JsonResponse
    {
        $project = Project::query()
            ->publiclyVisible()
            ->findOrFail($project);

        return response()->json(['project' => new ProjectResource($project)]);
    }
}
