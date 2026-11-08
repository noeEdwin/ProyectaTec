<?php

namespace App\Http\Controllers;

use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\ProjectNeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicationStatsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $adminEmails = array_map('strtolower', config('services.proyectatec.admin_emails', []));
        abort_unless(in_array(strtolower($request->user()->email), $adminEmails, true), 403);

        $projects = $this->counts(Project::class);
        $communityNeeds = $this->counts(CommunityNeed::class);
        $projectNeeds = $this->counts(ProjectNeed::class);

        return response()->json([
            'total' => $projects['total'] + $communityNeeds['total'] + $projectNeeds['total'],
            'by_type' => [
                'projects' => $projects,
                'community_needs' => $communityNeeds,
                'project_needs' => $projectNeeds,
            ],
        ]);
    }

    private function counts(string $model): array
    {
        $statuses = $model::query()
            ->select('status')
            ->selectRaw('COUNT(*) as amount')
            ->groupBy('status')
            ->pluck('amount', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();
        ksort($statuses);

        return ['total' => array_sum($statuses), 'by_status' => $statuses];
    }
}
