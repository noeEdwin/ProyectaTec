<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectNeedRequest;
use App\Http\Resources\ProjectNeedResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectNeedController extends Controller
{
    private function publicProject(int $id): Project
    {
        return Project::query()
            ->whereIn('status', ['open', 'in_progress', 'completed'])
            ->findOrFail($id);
    }

    public function store(StoreProjectNeedRequest $request): JsonResponse
    {
        $project = $request->attributes->get('authorized_project');
        $need = $project->needs()->create($request->validated());

        return response()->json(['project_need' => new ProjectNeedResource($need)], 201);
    }

    public function index(Request $request, int $project): JsonResponse
    {
        $needs = $this->publicProject($project)->needs()
            ->where('status', 'open')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'project_needs' => ProjectNeedResource::collection($needs->items())->resolve($request),
            'meta' => [
                'current_page' => $needs->currentPage(),
                'per_page' => $needs->perPage(),
                'last_page' => $needs->lastPage(),
                'total' => $needs->total(),
            ],
        ]);
    }

    public function show(int $project, int $need): JsonResponse
    {
        $need = $this->publicProject($project)->needs()
            ->where('status', 'open')
            ->findOrFail($need);

        return response()->json(['project_need' => new ProjectNeedResource($need)]);
    }
}
