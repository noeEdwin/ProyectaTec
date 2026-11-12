<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommunityNeedRequest;
use App\Http\Requests\UpdateCommunityNeedRequest;
use App\Http\Resources\CommunityNeedResource;
use App\Models\CommunityNeed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CommunityNeedController extends Controller
{
    public function store(StoreCommunityNeedRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $communityNeed = CommunityNeed::create($data);

        return response()->json(['community_need' => new CommunityNeedResource($communityNeed)], 201);
    }

    public function update(UpdateCommunityNeedRequest $request, CommunityNeed $communityNeed): JsonResponse
    {
        $data = $request->validated();

        if ($data === []) {
            throw ValidationException::withMessages(['community_need' => ['Envía al menos un campo editable.']]);
        }

        $allowed = match ($communityNeed->status) {
            'draft' => ['draft', 'open', 'withdrawn'],
            'open' => ['open', 'closed', 'withdrawn'],
            'closed' => ['closed'],
            'withdrawn' => ['withdrawn'],
            default => [],
        };

        if (array_key_exists('status', $data) && ! in_array($data['status'], $allowed, true)) {
            throw ValidationException::withMessages(['status' => ['No se permite esta transición de estado.']]);
        }

        $communityNeed->update($data);

        return response()->json(['community_need' => new CommunityNeedResource($communityNeed->fresh())]);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'category_id' => ['sometimes', 'required', 'integer', 'min:1', 'max:9223372036854775807'],
        ]);

        $search = trim($filters['q'] ?? '');

        $communityNeeds = CommunityNeed::query()
            ->where('status', 'open')
            ->where('is_hidden', false)
            ->when($search !== '', function ($query) use ($search) {
                $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], strtolower($search)).'%';

                $query->where(function ($query) use ($pattern) {
                    $query->whereRaw("LOWER(title) LIKE ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("LOWER(description) LIKE ? ESCAPE '!'", [$pattern]);
                });
            })
            ->when(isset($filters['category_id']), fn ($query) => $query->where('category_id', $filters['category_id']))
            ->with('category:id,name')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'community_needs' => CommunityNeedResource::collection($communityNeeds->items())->resolve($request),
            'meta' => [
                'current_page' => $communityNeeds->currentPage(),
                'per_page' => $communityNeeds->perPage(),
                'last_page' => $communityNeeds->lastPage(),
                'total' => $communityNeeds->total(),
            ],
        ]);
    }

    public function show(int $communityNeed): JsonResponse
    {
        $communityNeed = CommunityNeed::query()
            ->where('status', 'open')
            ->where('is_hidden', false)
            ->with('category:id,name')
            ->findOrFail($communityNeed);

        return response()->json(['community_need' => new CommunityNeedResource($communityNeed)]);
    }
}
