<?php

namespace App\Http\Controllers;

use App\Models\CommunityNeed;
use App\Models\Project;
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