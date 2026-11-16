<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectUpdateRequest;
use App\Http\Requests\UpdateProjectUpdateRequest;
use App\Http\Resources\ProjectUpdateResource;
use App\Models\Project;
use App\Models\ProjectUpdate;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class ProjectUpdateController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            function (Request $request, Closure $next): Response {
                $projectParameter = $request->route('project');
                $projectId = $projectParameter instanceof Project ? $projectParameter->getKey() : $projectParameter;
                $project = Project::query()->publiclyVisible()->findOrFail($projectId);
                $request->route()->setParameter('project', $project);

                $updateParameter = $request->route('update');
                if ($updateParameter !== null) {
                    $updateId = $updateParameter instanceof ProjectUpdate ? $updateParameter->getKey() : $updateParameter;
                    $update = $project->updates()->findOrFail($updateId);
                    $update->setRelation('project', $project);
                    $request->route()->setParameter('update', $update);
                }

                return $next($request);
            },
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $project = $request->route('project');
        $updates = $project->updates()
            ->with('creator:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        $latestProgress = $project->updates()
            ->whereNotNull('progress')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->first(['id', 'progress', 'created_at']);

        return response()->json([
            'project_updates' => ProjectUpdateResource::collection($updates->items())->resolve($request),
            'latest_progress' => $latestProgress ? [
                'update_id' => $latestProgress->id,
                'progress' => $latestProgress->progress,
                'created_at' => $latestProgress->created_at?->toISOString(),
            ] : null,
            'meta' => [
                'current_page' => $updates->currentPage(),
                'per_page' => $updates->perPage(),
                'last_page' => $updates->lastPage(),
                'total' => $updates->total(),
            ],
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $update = $request->route('update')->load('creator:id,name');

        return response()->json(['project_update' => new ProjectUpdateResource($update)]);
    }

    public function store(StoreProjectUpdateRequest $request): JsonResponse
    {
        $project = $request->route('project');
        $this->ensureWritable($project);

        $update = $project->updates()->create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'project_update' => new ProjectUpdateResource($update->load('creator:id,name')),
        ], 201);
    }

    public function update(UpdateProjectUpdateRequest $request): JsonResponse
    {
        $this->ensureWritable($request->route('project'));
        $update = $request->route('update');
        $update->update($request->validated());

        return response()->json([
            'project_update' => new ProjectUpdateResource($update->load('creator:id,name')),
        ]);
    }

    private function ensureWritable(Project $project): void
    {
        if (! in_array($project->status, ['open', 'in_progress'], true)) {
            throw ValidationException::withMessages([
                'project' => ['Este proyecto no permite registrar ni modificar avances.'],
            ]);
        }
    }
}
