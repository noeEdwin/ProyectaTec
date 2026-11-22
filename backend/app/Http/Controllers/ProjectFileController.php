<?php
namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectUpdate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectFileController extends Controller
{
    private function visibleProject(string $id): Project
    {
        return Project::query()
            ->publiclyVisible()
            ->findOrFail($id);
    }

    private function resolveUpdate(
        Project $project,
        ?string $update
    ): ?ProjectUpdate {
        return $update === null
            ? null
            : $project->updates()->findOrFail($update);
    }

    private function formatFile(ProjectFile $file): array
    {
        return [
            'id' => $file->id,
            'project_id' => $file->project_id,
            'project_update_id' => $file->project_update_id,
            'original_name' => $file->original_name,
            'mime_type' => $file->mime_type,
            'file_size' => $file->file_size,
            'uploaded_by' => [
                'id' => $file->uploader->id,
                'name' => $file->uploader->name,
            ],
            'created_at' => $file->created_at?->toISOString(),
        ];
    }

    public function index(
        string $project,
        ?string $update = null
    ): JsonResponse {
        $visibleProject = $this->visibleProject($project);
        $projectUpdate = $this->resolveUpdate(
            $visibleProject,
            $update
        );

        $query = $visibleProject->files()
            ->with('uploader:id,name');

        if ($projectUpdate !== null) {
            $query->where(
                'project_update_id',
                $projectUpdate->id
            );
        }

        $files = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'project_id' => $visibleProject->id,
            'project_update_id' => $projectUpdate?->id,
            'files' => $files->getCollection()
                ->map(fn ($file) => $this->formatFile($file))
                ->values(),
            'meta' => [
                'current_page' => $files->currentPage(),
                'per_page' => $files->perPage(),
                'last_page' => $files->lastPage(),
                'total' => $files->total(),
            ],
        ]);
    }

    public function store(
        Request $request,
        string $project,
        ?string $update = null
    ): JsonResponse {
        $visibleProject = $this->visibleProject($project);
        $projectUpdate = $this->resolveUpdate(
            $visibleProject,
            $update
        );

        Gate::authorize('create', [
            ProjectUpdate::class,
            $visibleProject,
        ]);

        if (! in_array(
            $visibleProject->status,
            ['open', 'in_progress'],
            true
        )) {
            throw ValidationException::withMessages([
                'project' => [
                    'Este proyecto no admite nuevas evidencias.',
                ],
            ]);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,txt',
                'max:5120',
            ],
            'project_id' => ['prohibited'],
            'project_update_id' => ['prohibited'],
            'uploaded_by' => ['prohibited'],
            'file_path' => ['prohibited'],
        ]);

        $uploaded = $request->file('file');

        $path = $uploaded->store(
            'project-evidence/'.$visibleProject->id,
            'local'
        );

        if (! is_string($path)) {
            abort(500, 'No se pudo guardar el archivo.');
        }

        $rawName = preg_replace(
            '/[\x00-\x1F\x7F]+/',
            '',
            basename(str_replace(
                '\\',
                '/',
                $uploaded->getClientOriginalName()
            ))
        );
        $originalName = mb_substr(trim((string) $rawName), 0, 255) ?: 'archivo';

        try {
            $file = $visibleProject->files()->create([
                'project_update_id' => $projectUpdate?->id,
                'uploaded_by' => $request->user()->id,
                'original_name' => $originalName,
                'file_path' => $path,
                'mime_type' => $uploaded->getMimeType(),
                'file_size' => $uploaded->getSize(),
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return response()->json([
            'message' => 'Evidencia registrada correctamente.',
            'file' => $this->formatFile(
                $file->load('uploader:id,name')
            ),
        ], 201);
    }

    public function download(
        string $project,
        string $file
    ): StreamedResponse {
        $visibleProject = $this->visibleProject($project);

        $record = $visibleProject->files()
            ->findOrFail($file);

        abort_unless(
            Storage::disk('local')->exists($record->file_path),
            404
        );

        return Storage::disk('local')->download(
            $record->file_path,
            $record->original_name,
            ['X-Content-Type-Options' => 'nosniff']
        );
    }
}
