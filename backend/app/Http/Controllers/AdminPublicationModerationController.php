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

        return response()->json([
            'message' => $project->is_hidden
                ? 'Proyecto ocultado correctamente.'
                : 'Proyecto restaurado correctamente.',
            'project' => [
                'id' => $project->id,
                'is_hidden' => $project->is_hidden,
                'status' => $project->status,
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
                'is_hidden' => $communityNeed->is_hidden,
                'status' => $communityNeed->status,
            ],
        ]);
    }
}
