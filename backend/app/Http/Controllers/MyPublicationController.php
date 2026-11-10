<?php

namespace App\Http\Controllers;

use App\Http\Resources\CommunityNeedResource;
use App\Http\Resources\ProjectResource;
use App\Models\CommunityNeed;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class MyPublicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $projects = Project::query()
            ->where(function ($query) use ($user) {
                $query->where('created_by', $user->id)
                    ->orWhereHas('organization.memberships', fn ($membership) => $membership
                        ->where('user_id', $user->id)
                        ->where('role', 'admin')
                        ->where('status', 'active'));
            })
            ->with('organization')
            ->latest('updated_at')
            ->get()
            ->filter(fn (Project $project) => Gate::forUser($user)->allows('update', $project))
            ->map(fn (Project $project) => [
                ... (new ProjectResource($project))->resolve($request),
                'type' => 'proyecto',
                'can_edit' => true,
            ]);

        $needs = CommunityNeed::query()
            ->where('created_by', $user->id)
            ->latest('updated_at')
            ->get()
            ->filter(fn (CommunityNeed $need) => Gate::forUser($user)->allows('update', $need))
            ->map(fn (CommunityNeed $need) => [
                ... (new CommunityNeedResource($need))->resolve($request),
                'type' => 'necesidad',
                'can_edit' => true,
            ]);

        return response()->json([
            'publications' => $projects->concat($needs)->sortByDesc('updated_at')->values(),
        ]);
    }

    public function show(Request $request, string $type, int $id): JsonResponse
    {
        if ($type === 'proyecto') {
            $publication = Project::with('organization')->findOrFail($id);
            Gate::authorize('update', $publication);

            return response()->json(['project' => new ProjectResource($publication)]);
        }

        if ($type === 'necesidad') {
            $publication = CommunityNeed::findOrFail($id);
            Gate::authorize('update', $publication);

            return response()->json(['community_need' => new CommunityNeedResource($publication)]);
        }

        abort(404);
    }
}
