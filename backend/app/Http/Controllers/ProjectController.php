<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\OrganizationMember;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectController extends Controller
{
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $data = $request->validated();
        $needs = $data['needs'] ?? null;
        unset($data['needs']);

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

        $project = DB::transaction(function () use ($data, $needs) {
            $project = Project::create($data);

            if (is_array($needs)) {
                foreach ($needs as $item) {
                    $title = trim((string) $item['title']);
                    $description = trim((string) ($item['description'] ?? ''));
                    $requiredProfile = trim((string) ($item['required_profile'] ?? ''));

                    $project->needs()->create([
                        'title' => $title,
                        'description' => $description !== '' ? $description : $title,
                        'required_profile' => $requiredProfile !== '' ? $requiredProfile : null,
                        'openings' => (int) ($item['openings'] ?? 1),
                        'status' => 'open',
                    ]);
                }
            }

            return $project->load(['category:id,name', 'organization:id,name', 'needs']);
        });

        return response()->json(['project' => new ProjectResource($project)], 201);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        if ($data === []) {
            throw ValidationException::withMessages(['project' => ['Envía al menos un campo editable.']]);
        }

        $hasNeeds = array_key_exists('needs', $data);
        $needs = $data['needs'] ?? [];
        unset($data['needs']);

        $allowed = match ($project->status) {
            'draft' => ['draft', 'open', 'withdrawn'],
            'open' => ['open', 'in_progress', 'completed', 'closed', 'withdrawn'],
            'in_progress' => ['in_progress', 'completed', 'closed', 'withdrawn'],
            'completed' => ['completed', 'closed', 'withdrawn'],
            'closed' => ['closed'],
            'withdrawn' => ['withdrawn'],
            default => [],
        };

        if (array_key_exists('status', $data) && ! in_array($data['status'], $allowed, true)) {
            throw ValidationException::withMessages(['status' => ['No se permite esta transición de estado.']]);
        }

        $startsAt = array_key_exists('starts_at', $data) ? $data['starts_at'] : $project->starts_at;
        $endsAt = array_key_exists('ends_at', $data) ? $data['ends_at'] : $project->ends_at;
        if ($startsAt !== null && $endsAt !== null && Carbon::parse($endsAt)->lt(Carbon::parse($startsAt))) {
            throw ValidationException::withMessages(['ends_at' => ['La fecha de fin no puede ser anterior a la de inicio.']]);
        }

        DB::transaction(function () use ($project, $data, $hasNeeds, $needs) {
            if ($data !== []) {
                $project->update($data);
            }

            if (! $hasNeeds || ! is_array($needs)) {
                return;
            }

            $existing = $project->needs()->withCount('applications')->get()->keyBy('id');
            $keptIds = [];

            foreach ($needs as $item) {
                $title = trim((string) $item['title']);
                $description = trim((string) ($item['description'] ?? ''));
                $requiredProfile = trim((string) ($item['required_profile'] ?? ''));
                $payload = [
                    'title' => $title,
                    'description' => $description !== '' ? $description : $title,
                    'required_profile' => $requiredProfile !== '' ? $requiredProfile : null,
                    'openings' => (int) ($item['openings'] ?? 1),
                ];

                $needId = isset($item['id']) ? (int) $item['id'] : null;
                if ($needId && $existing->has($needId)) {
                    $existing->get($needId)->update($payload);
                    $keptIds[] = $needId;
                } else {
                    $created = $project->needs()->create([...$payload, 'status' => 'open']);
                    $keptIds[] = $created->id;
                }
            }

            foreach ($existing as $need) {
                if (! in_array($need->id, $keptIds, true) && $need->applications_count === 0) {
                    $need->delete();
                }
            }
        });

        return response()->json([
            'project' => new ProjectResource($project->fresh(['category:id,name', 'organization:id,name', 'needs'])),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'category_id' => ['sometimes', 'required', 'integer', 'min:1', 'max:9223372036854775807'],
            'sector' => ['nullable', 'string', 'max:255'],
        ]);

        $search = trim($filters['q'] ?? '');
        $sector = trim($filters['sector'] ?? '');

        $projects = Project::query()
            ->publiclyVisible()
            ->when($search !== '', function ($query) use ($search) {
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], strtolower($search)).'%';

                $query->where(function ($query) use ($pattern) {
                    $query->whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("LOWER(description) LIKE ? ESCAPE '!'", [$pattern]);
                });
            })
            ->when(isset($filters['category_id']), fn ($query) => $query->where('category_id', $filters['category_id']))
            ->when($sector !== '', fn ($query) => $query->whereHas('organization', fn ($organization) => $organization->where('sector', $sector)))
            ->with(['category:id,name', 'organization:id,name', 'needs'])
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
            ->with(['category:id,name', 'organization:id,name', 'needs'])
            ->findOrFail($project);

        return response()->json(['project' => new ProjectResource($project)]);
    }
}
