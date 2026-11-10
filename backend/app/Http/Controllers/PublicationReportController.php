<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePublicationReportRequest;
use App\Http\Resources\PublicationReportResource;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\PublicationReport;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PublicationReportController extends Controller
{
    public function store(StorePublicationReportRequest $request): JsonResponse
    {
        $data = $request->validated();
if (isset($data['project_id'])) {
    Project::publiclyVisible()->findOrFail($data['project_id']);
} else {
    CommunityNeed::query()
        ->where('is_hidden', false)
        ->where('status', 'open')
        ->findOrFail($data['community_need_id']);
}

        try {
            $report = PublicationReport::create([
                ...$data,
                'reporter_id' => $request->user()->id,
                'status' => 'pending',
            ]);
        } catch (UniqueConstraintViolationException) {
            $field = isset($data['project_id']) ? 'project_id' : 'community_need_id';
            throw ValidationException::withMessages([$field => ['Ya reportaste esta publicación.']]);
        }

        return response()->json(['report' => new PublicationReportResource($report)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePlatformAdmin($request);
        $reports = PublicationReport::query()->orderByDesc('created_at')->orderByDesc('id')->paginate(15);

        return response()->json([
            'reports' => PublicationReportResource::collection($reports->items())->resolve($request),
            'meta' => [
                'current_page' => $reports->currentPage(),
                'per_page' => $reports->perPage(),
                'last_page' => $reports->lastPage(),
                'total' => $reports->total(),
            ],
        ]);
    }

    private function authorizePlatformAdmin(Request $request): void
    {
        $adminEmails = array_map('strtolower', config('services.proyectatec.admin_emails', []));
        abort_unless(in_array(strtolower($request->user()->email), $adminEmails, true), 403);
    }
}
