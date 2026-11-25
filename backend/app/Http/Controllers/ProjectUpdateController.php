<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectUpdateRequest;
use App\Http\Requests\UpdateProjectUpdateRequest;
use App\Http\Resources\ProjectUpdateResource;
use App\Models\Project;
use App\Models\ProjectUpdate;
use App\Models\User;
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

        $data = $request->validated();
        $this->validateProgressChange($request->user(), $project, $data['progress'] ?? null, array_key_exists('progress', $data));

        $update = $project->updates()->create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'project_update' => new ProjectUpdateResource($update->load('creator:id,name')),
        ], 201);
    }

    public function update(UpdateProjectUpdateRequest $request): JsonResponse
    {
        $project = $request->route('project');
        $this->ensureWritable($project);
        $update = $request->route('update');

        $data = $request->validated();
        if (array_key_exists('progress', $data)) {
            $this->validateProgressChange($request->user(), $project, $data['progress'], true, $update->id);
        }

        $update->update($data);

        return response()->json([
            'project_update' => new ProjectUpdateResource($update->load('creator:id,name')),
        ]);
    }

    private function canManageProgress(User $user, Project $project): bool
    {
        if ((int) $project->created_by === (int) $user->id) {
            return true;
        }

        return $project->organization_id !== null
            && $project->organization !== null
            && $project->organization->memberships()
                ->where('user_id', $user->id)
                ->where('role', 'admin')
                ->where('status', 'active')
                ->exists();
    }

    private function validateProgressChange(
        User $user,
        Project $project,
        mixed $progress,
        bool $hasProgressKey,
        ?int $ignoreUpdateId = null
    ): void {
        if (! $hasProgressKey || $progress === null) {
            return;
        }

        if (! $this->canManageProgress($user, $project)) {
            abort(403, 'Solo el responsable del proyecto puede actualizar el porcentaje de avance.');
        }

        $maxExisting = $project->updates()
            ->whereNotNull('progress')
            ->when($ignoreUpdateId !== null, fn ($q) => $q->where('id', '!=', $ignoreUpdateId))
            ->max('progress');

        if ($maxExisting !== null && (int) $progress < (int) $maxExisting) {
            throw ValidationException::withMessages([
                'progress' => ["El porcentaje de avance no puede retroceder por debajo del avance actual ({$maxExisting}%)."],
            ]);
        }
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
