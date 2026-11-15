<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $gallery = collect($this->gallery_paths ?? [])
            ->filter(fn ($path) => is_string($path) && OrganizationResource::logoUrl($path) !== null)
            ->map(fn (string $path) => [
                'path' => $path,
                'url' => OrganizationResource::logoUrl($path),
            ])
            ->values()
            ->all();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'organization_id' => $this->organization_id,
            'organization' => $this->whenLoaded('organization', fn () => [
                'id' => $this->organization->id,
                'name' => $this->organization->name,
            ]),
            'modality' => $this->modality,
            'location' => $this->location,
            'starts_at' => $this->starts_at?->toISOString(),
            'ends_at' => $this->ends_at?->toISOString(),
            'cover_image_url' => OrganizationResource::logoUrl($this->cover_image_path),
            'gallery' => $gallery,
            'gallery_urls' => array_column($gallery, 'url'),
            'needs' => $this->whenLoaded('needs', fn () => $this->needs->map(fn ($need) => [
                'id' => $need->id,
                'title' => $need->title,
                'description' => $need->description,
                'required_profile' => $need->required_profile,
                'openings' => $need->openings,
                'status' => $need->status,
            ])->values()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
