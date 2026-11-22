<?php
namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectUpdate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ProjectCommentController extends Controller
{
    public function index(
        string $project,
        string $update
    ): JsonResponse {
        $visibleProject = Project::query()
            ->publiclyVisible()
            ->findOrFail($project);

        $projectUpdate = $visibleProject
            ->updates()
            ->findOrFail($update);

        $comments = $projectUpdate
            ->comments()
            ->with('user:id,name')
            ->orderBy('created_at')
            ->orderBy('id')
            ->paginate(15);

        return response()->json([
            'project_id' => $visibleProject->id,
            'project_update_id' => $projectUpdate->id,

            'comments' => $comments->getCollection()
                ->map(function ($comment) {
                    return [
                        'id' => $comment->id,
                        'content' => $comment->content,
                        'user' => [
                            'id' => $comment->user->id,
                            'name' => $comment->user->name,
                        ],
                        'created_at' => $comment->created_at
                            ?->toISOString(),
                    ];
                })
                ->values(),

            'meta' => [
                'current_page' => $comments->currentPage(),
                'per_page' => $comments->perPage(),
                'last_page' => $comments->lastPage(),
                'total' => $comments->total(),
            ],
        ]);
    }

    public function store(
        Request $request,
        string $project,
        string $update
    ): JsonResponse {
        $visibleProject = Project::query()
            ->publiclyVisible()
            ->findOrFail($project);

        $projectUpdate = $visibleProject
            ->updates()
            ->findOrFail($update);

        Gate::authorize('create', [
            ProjectUpdate::class,
            $visibleProject,
        ]);

        if (! in_array($visibleProject->status, ['open', 'in_progress'], true)) {
            throw ValidationException::withMessages([
                'project' => ['Este proyecto no admite nuevos comentarios.'],
            ]);
        }

        $data = $request->validate([
            'content' => [
                'required',
                'string',
                'min:1',
                'max:2000',
            ],
            'user_id' => ['prohibited'],
            'project_id' => ['prohibited'],
            'project_update_id' => ['prohibited'],
        ]);

        $comment = $projectUpdate
            ->comments()
            ->create([
                'user_id' => $request->user()->id,
                'content' => $data['content'],
            ]);

        $comment->load('user:id,name');

        return response()->json([
            'message' => 'Comentario registrado correctamente.',
            'comment' => [
                'id' => $comment->id,
                'content' => $comment->content,
                'user' => [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                ],
                'created_at' => $comment->created_at
                    ?->toISOString(),
            ],
        ], 201);
    }
}
