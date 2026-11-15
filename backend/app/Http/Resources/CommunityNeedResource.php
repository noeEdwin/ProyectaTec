<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommunityNeedResource extends JsonResource
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
            'location' => $this->location,
            'cover_image_url' => OrganizationResource::logoUrl($this->cover_image_path),
            'gallery' => $gallery,
            'gallery_urls' => array_column($gallery, 'url'),
            'requirements' => $this->requirements ?? [],
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
