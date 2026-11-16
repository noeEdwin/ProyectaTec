<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReviewApplicationRequest;
use App\Http\Requests\StoreApplicationRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Application;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use App\Notifications\ApplicationReviewedNotification;
use App\Notifications\ApplicationSubmittedNotification;
use App\Policies\ApplicationPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ApplicationController extends Controller
{
    private const APPLICATION_RELATIONS = [
        'project.organization:id,name',
        'projectNeed:id,project_id,title,required_profile,status',
        'user.profile:id,user_id,display_name',
        'reviewer:id,name',
        'projectMember:id,project_id,user_id,application_id,role,status,joined_at',
    ];

    public function store(StoreApplicationRequest $request, Project $project): JsonResponse
    {
        Gate::authorize('create', Application::class);

        $visibleProject = Project::publiclyVisible()->findOrFail($project->id);
        $user = $request->user();

        if (! in_array($visibleProject->status, ['open', 'in_progress'], true)) {
            throw ValidationException::withMessages([
                'project_id' => ['Este proyecto ya no acepta nuevas solicitudes.'],
            ]);
        }

        if ((new ApplicationPolicy())->canManageProject($user, $visibleProject)) {
            throw ValidationException::withMessages([
                'project_id' => ['No puedes postularte a un proyecto que administras.'],
            ]);
        }

        $data = $request->validated();
        $needId = $data['project_need_id'] ?? null;

        if ($needId !== null) {
            $need = $visibleProject->needs()->whereKey($needId)->first();

            if (! $need) {
                throw ValidationException::withMessages([
                    'project_need_id' => ['La necesidad seleccionada no pertenece a este proyecto.'],
                ]);
            }

            if ($need->status !== 'open') {
                throw ValidationException::withMessages([
                    'project_need_id' => ['La necesidad seleccionada ya no está abierta.'],
                ]);
            }
        }

        $hasActiveApplication = Application::query()
            ->where('project_id', $visibleProject->id)
            ->where('user_id', $user->id)
            ->whereIn('status', [Application::STATUS_PENDING, Application::STATUS_ACCEPTED])
            ->exists();

        $isActiveMember = ProjectMember::query()
            ->where('project_id', $visibleProject->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if ($hasActiveApplication || $isActiveMember) {
            throw ValidationException::withMessages([
                'project_id' => ['Ya tienes una solicitud activa o participación registrada en este proyecto.'],
            ]);
        }

        $message = isset($data['message']) ? trim((string) $data['message']) : '';

        $application = DB::transaction(function () use ($visibleProject, $user, $needId, $message) {
            $application = Application::create([
                'project_id' => $visibleProject->id,
                'project_need_id' => $needId,
                'user_id' => $user->id,
                'message' => $message !== '' ? $message : null,
                'status' => Application::STATUS_PENDING,
            ]);

            $application->load(['project:id,title,created_by,organization_id', 'user:id,name']);

            foreach ($this->projectReviewRecipients($visibleProject) as $recipient) {
                $recipient->notify(new ApplicationSubmittedNotification($application));
            }

            return $application;
        });

        return response()->json([
            'application' => new ApplicationResource($application->load(self::APPLICATION_RELATIONS)),
        ], 201);
    }

    public function indexOwn(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Application::class);

        $status = $this->validatedStatusFilter($request);

        $applications = Application::query()
            ->where('user_id', $request->user()->id)
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->with(self::APPLICATION_RELATIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'applications' => ApplicationResource::collection($applications->items())->resolve($request),
            'meta' => $this->paginationMeta($applications),
        ]);
    }

    public function indexByProject(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('viewProjectApplications', [Application::class, $project]);

        $status = $this->validatedStatusFilter($request);

        $applications = $project->applications()
            ->when($status !== null, fn ($query) => $query->where('status', $status))
            ->with(self::APPLICATION_RELATIONS)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'applications' => ApplicationResource::collection($applications->items())->resolve($request),
            'meta' => $this->paginationMeta($applications),
        ]);
    }

    public function show(Application $application): JsonResponse
    {
        Gate::authorize('view', $application);

        return response()->json([
            'application' => new ApplicationResource($application->load(self::APPLICATION_RELATIONS)),
        ]);
    }

    public function review(ReviewApplicationRequest $request, Application $application): JsonResponse
    {
        Gate::authorize('update', $application);

        $data = $request->validated();
        $reviewer = $request->user();
        $reviewNotes = isset($data['review_notes']) ? trim((string) $data['review_notes']) : '';
        $role = isset($data['role']) ? trim((string) $data['role']) : '';

        $updatedApplication = DB::transaction(function () use ($application, $data, $reviewer, $reviewNotes, $role) {
            /** @var Application $locked */
            $locked = Application::query()->lockForUpdate()->findOrFail($application->id);

            if ($locked->status !== Application::STATUS_PENDING) {
                throw ValidationException::withMessages([
                    'status' => ['Solo se pueden revisar solicitudes en estado pendiente.'],
                ]);
            }

            $locked->update([
                'status' => $data['status'],
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'review_notes' => $reviewNotes !== '' ? $reviewNotes : null,
            ]);

            if ($data['status'] === Application::STATUS_ACCEPTED) {
                ProjectMember::query()->updateOrCreate(
                    [
                        'project_id' => $locked->project_id,
                        'user_id' => $locked->user_id,
                    ],
                    [
                        'application_id' => $locked->id,
                        'role' => $role !== '' ? $role : 'collaborator',
                        'status' => 'active',
                        'joined_at' => now(),
                    ]
                );
            }

            $locked->load(['project:id,title', 'user']);

            if ($locked->user && $locked->user->is_active) {
                $locked->user->notify(new ApplicationReviewedNotification($locked));
            }

            return $locked;
        });

        return response()->json([
            'application' => new ApplicationResource($updatedApplication->load(self::APPLICATION_RELATIONS)),
        ]);
    }

    private function validatedStatusFilter(Request $request): ?string
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in([
                Application::STATUS_PENDING,
                Application::STATUS_ACCEPTED,
                Application::STATUS_REJECTED,
            ])],
        ]);

        return $validated['status'] ?? null;
    }

    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ];
    }

    /**
     * @return array<int, User>
     */
    private function projectReviewRecipients(Project $project): array
    {
        $recipients = collect();

        $creator = User::query()
            ->whereKey($project->created_by)
            ->where('is_active', true)
            ->first();

        if ($creator) {
            $recipients->put($creator->id, $creator);
        }

        if ($project->organization_id !== null) {
            $adminMembers = OrganizationMember::query()
                ->with('user')
                ->where('organization_id', $project->organization_id)
                ->where('role', 'admin')
                ->where('status', 'active')
                ->get();

            foreach ($adminMembers as $membership) {
                if ($membership->user && $membership->user->is_active) {
                    $recipients->put($membership->user->id, $membership->user);
                }
            }
        }

        return $recipients->values()->all();
    }
}
