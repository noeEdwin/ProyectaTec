<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrganizationResource;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\PublicationReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPublicationModerationController extends Controller
{
    private function authorizePlatformAdmin(Request $request): void
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
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePlatformAdmin($request);

        $projectQuery = Project::query();
        if (method_exists(Project::class, 'organization')) {
            $projectQuery->with('organization');
        }

        $projects = $projectQuery->get()->map(fn (Project $p) => [
            'id' => $p->id,
            'type' => 'proyecto',
            'title' => $p->title ?? "Proyecto #{$p->id}",
            'author_name' => $p->organization?->name ?? $p->location ?? 'ProyectaTec',
            'is_hidden' => (bool) $p->is_hidden,
            'created_at' => optional($p->created_at)->toISOString() ?? now()->toISOString(),
        ]);

        $needs = CommunityNeed::query()->get()->map(fn (CommunityNeed $n) => [
            'id' => $n->id,
            'type' => 'necesidad',
            'title' => $n->title ?? "Necesidad #{$n->id}",
            'author_name' => $n->location ?? 'Comunidad',
            'is_hidden' => (bool) $n->is_hidden,
            'created_at' => optional($n->created_at)->toISOString() ?? now()->toISOString(),
        ]);

        $publications = $projects
            ->concat($needs)
            ->sortByDesc(fn (array $item) => [$item['created_at'], $item['id']])
            ->values();

        return response()->json([
            'publications' => $publications,
        ]);
    }

    public function show(Request $request, string $type, int $id): JsonResponse
    {
        $this->authorizePlatformAdmin($request);

        if ($type === 'proyecto') {
            $project = Project::query()
                ->with([
                    'category:id,name',
                    'organization:id,name,organization_type,sector,location,approval_status',
                    'creator:id,name,email,account_type,is_active',
                    'creator.profile:id,user_id,display_name,institution,organization_name',
                    'needs:id,project_id,title,description,required_profile,openings,status',
                ])
                ->withCount('applications')
                ->findOrFail($id);

            $reports = PublicationReport::query()
                ->with('reporter:id,name,email')
                ->where('project_id', $project->id)
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (PublicationReport $r) => [
                    'id' => $r->id,
                    'reason' => $r->reason,
                    'details' => $r->details,
                    'status' => $r->status,
                    'decision_notes' => $r->decision_notes,
                    'created_at' => optional($r->created_at)->toISOString(),
                    'reporter' => $r->reporter ? [
                        'id' => $r->reporter->id,
                        'name' => $r->reporter->name,
                        'email' => $r->reporter->email,
                    ] : null,
                ]);

            return response()->json([
                'publication' => [
                    'id' => $project->id,
                    'type' => 'proyecto',
                    'title' => $project->title,
                    'description' => $project->description,
                    'status' => $project->status,
                    'is_hidden' => (bool) $project->is_hidden,
                    'modality' => $project->modality,
                    'location' => $project->location,
                    'starts_at' => optional($project->starts_at)->toISOString(),
                    'ends_at' => optional($project->ends_at)->toISOString(),
                    'cover_image_url' => OrganizationResource::logoUrl($project->cover_image_path),
                    'gallery_urls' => collect($project->gallery_paths ?? [])
                        ->map(fn ($path) => OrganizationResource::logoUrl(is_string($path) ? $path : null))
                        ->filter()
                        ->values()
                        ->all(),
                    'category' => $project->category ? [
                        'id' => $project->category->id,
                        'name' => $project->category->name,
                        'sector' => $project->organization?->sector,
                    ] : null,
                    'organization' => $project->organization ? [
                        'id' => $project->organization->id,
                        'name' => $project->organization->name,
                        'organization_type' => $project->organization->organization_type,
                        'sector' => $project->organization->sector,
                        'location' => $project->organization->location,
                        'approval_status' => $project->organization->approval_status,
                    ] : null,
                    'author' => $project->creator ? [
                        'id' => $project->creator->id,
                        'name' => $project->creator->name,
                        'email' => $project->creator->email,
                        'account_type' => $project->creator->account_type,
                        'is_active' => (bool) $project->creator->is_active,
                        'institution' => $project->creator->profile?->institution,
                        'organization_name' => $project->creator->profile?->organization_name,
                    ] : null,
                    'needs' => $project->needs->map(fn ($need) => [
                        'id' => $need->id,
                        'title' => $need->title,
                        'description' => $need->description,
                        'required_profile' => $need->required_profile,
                        'openings' => $need->openings,
                        'status' => $need->status,
                    ])->values(),
                    'applications_count' => $project->applications_count,
                    'reports' => $reports,
                    'created_at' => optional($project->created_at)->toISOString(),
                    'updated_at' => optional($project->updated_at)->toISOString(),
                ],
            ]);
        }

        abort_unless($type === 'necesidad', 404);

        $need = CommunityNeed::query()
            ->with([
                'category:id,name',
                'creator:id,name,email,account_type,is_active',
                'creator.profile:id,user_id,display_name,institution,organization_name',
            ])
            ->findOrFail($id);

        $reports = PublicationReport::query()
            ->with('reporter:id,name,email')
            ->where('community_need_id', $need->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PublicationReport $r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'details' => $r->details,
                'status' => $r->status,
                'decision_notes' => $r->decision_notes,
                'created_at' => optional($r->created_at)->toISOString(),
                'reporter' => $r->reporter ? [
                    'id' => $r->reporter->id,
                    'name' => $r->reporter->name,
                    'email' => $r->reporter->email,
                ] : null,
            ]);

        return response()->json([
            'publication' => [
                'id' => $need->id,
                'type' => 'necesidad',
                'title' => $need->title,
                'description' => $need->description,
                'status' => $need->status,
                'is_hidden' => (bool) $need->is_hidden,
                'modality' => null,
                'location' => $need->location,
                'starts_at' => null,
                'ends_at' => null,
                'cover_image_url' => OrganizationResource::logoUrl($need->cover_image_path),
                'gallery_urls' => collect($need->gallery_paths ?? [])
                    ->map(fn ($path) => OrganizationResource::logoUrl(is_string($path) ? $path : null))
                    ->filter()
                    ->values()
                    ->all(),
                'category' => $need->category ? [
                    'id' => $need->category->id,
                    'name' => $need->category->name,
                    'sector' => null,
                ] : null,
                'organization' => null,
                'author' => $need->creator ? [
                    'id' => $need->creator->id,
                    'name' => $need->creator->name,
                    'email' => $need->creator->email,
                    'account_type' => $need->creator->account_type,
                    'is_active' => (bool) $need->creator->is_active,
                    'institution' => $need->creator->profile?->institution,
                    'organization_name' => $need->creator->profile?->organization_name,
                ] : null,
                'needs' => collect($need->requirements ?? [])->values()->map(fn ($item, int $idx) => [
                    'id' => $idx + 1,
                    'title' => $item['title'] ?? 'Requerimiento',
                    'description' => $item['description'] ?? null,
                    'required_profile' => $item['required_profile'] ?? null,
                    'openings' => (int) ($item['openings'] ?? 1),
                    'status' => $need->status,
                ])->all(),
                'applications_count' => 0,
                'reports' => $reports,
                'created_at' => optional($need->created_at)->toISOString(),
                'updated_at' => optional($need->updated_at)->toISOString(),
            ],
        ]);
    }

    public function updateProjectVisibility(
        Request $request,
        Project $project
    ): JsonResponse {
        $this->authorizePlatformAdmin($request);

        $data = $request->validate([
            'is_hidden' => ['required', 'boolean'],
        ]);

        $project->is_hidden = (bool) $data['is_hidden'];
        $project->save();

        if (method_exists($project, 'organization')) {
            $project->loadMissing('organization');
        }

        return response()->json([
            'message' => $project->is_hidden
                ? 'Proyecto ocultado correctamente.'
                : 'Proyecto restaurado correctamente.',
            'project' => [
                'id' => $project->id,
                'title' => $project->title ?? "Proyecto #{$project->id}",
                'location' => $project->location,
                'organization' => $project->organization ? [
                    'id' => $project->organization->id,
                    'name' => $project->organization->name,
                ] : null,
                'is_hidden' => (bool) $project->is_hidden,
                'status' => $project->status,
                'created_at' => optional($project->created_at)->toISOString() ?? now()->toISOString(),
            ],
        ]);
    }

    public function updateCommunityNeedVisibility(
        Request $request,
        CommunityNeed $communityNeed
    ): JsonResponse {
        $this->authorizePlatformAdmin($request);

        $data = $request->validate([
            'is_hidden' => ['required', 'boolean'],
        ]);

        $communityNeed->is_hidden = (bool) $data['is_hidden'];
        $communityNeed->save();

        return response()->json([
            'message' => $communityNeed->is_hidden
                ? 'Necesidad comunitaria ocultada correctamente.'
                : 'Necesidad comunitaria restaurada correctamente.',
            'community_need' => [
                'id' => $communityNeed->id,
                'title' => $communityNeed->title ?? "Necesidad #{$communityNeed->id}",
                'location' => $communityNeed->location,
                'is_hidden' => (bool) $communityNeed->is_hidden,
                'status' => $communityNeed->status,
                'created_at' => optional($communityNeed->created_at)->toISOString() ?? now()->toISOString(),
            ],
        ]);
    }
}