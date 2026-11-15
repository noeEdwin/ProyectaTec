<?php

namespace App\Http\Controllers;

use App\Http\Resources\CommunityNeedResource;
use App\Http\Resources\ProjectResource;
use App\Models\CommunityNeed;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PublicationMediaController extends Controller
{
    public const MAX_GALLERY_ITEMS = 5;

    public function update(Request $request, string $type, int $id): JsonResponse
    {
        $isProject = $type === 'proyecto' || $type === 'project';
        $isNeed = $type === 'necesidad' || $type === 'community_need';
        abort_unless($isProject || $isNeed, 404);

        $publication = $isProject
            ? Project::with(['category:id,name', 'organization:id,name', 'needs'])->findOrFail($id)
            : CommunityNeed::with(['category:id,name'])->findOrFail($id);

        Gate::authorize('update', $publication);

        $validated = $request->validate([
            'cover_image' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:max_width=4096,max_height=4096'],
            'remove_cover' => ['sometimes', 'boolean'],
            'sync_gallery' => ['sometimes', 'boolean'],
            'keep_gallery' => ['sometimes', 'array', 'max:'.self::MAX_GALLERY_ITEMS],
            'keep_gallery.*' => ['string', 'max:255'],
            'gallery' => ['sometimes', 'array', 'max:'.self::MAX_GALLERY_ITEMS],
            'gallery.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        $existingGallery = is_array($publication->gallery_paths) ? $publication->gallery_paths : [];
        $shouldSyncGallery = array_key_exists('keep_gallery', $validated) || $request->boolean('sync_gallery');
        $keptGallery = $shouldSyncGallery
            ? array_values(array_intersect($existingGallery, $validated['keep_gallery'] ?? []))
            : $existingGallery;

        $uploadedFiles = $request->file('gallery', []);
        if (! is_array($uploadedFiles)) {
            $uploadedFiles = [];
        }

        if (count($keptGallery) + count($uploadedFiles) > self::MAX_GALLERY_ITEMS) {
            throw ValidationException::withMessages([
                'gallery' => ['La galería puede incluir máximo '.self::MAX_GALLERY_ITEMS.' imágenes.'],
            ]);
        }

        $pathsToDelete = [];
        $oldCoverPath = $publication->cover_image_path;

        if ($request->hasFile('cover_image')) {
            $publication->cover_image_path = $request->file('cover_image')->store('publications', 'public');
            if ($oldCoverPath) {
                $pathsToDelete[] = $oldCoverPath;
            }
        } elseif ($request->boolean('remove_cover') && $oldCoverPath) {
            $publication->cover_image_path = null;
            $pathsToDelete[] = $oldCoverPath;
        }

        $newGalleryPaths = [];
        foreach ($uploadedFiles as $file) {
            $newGalleryPaths[] = $file->store('publications', 'public');
        }

        $finalGallery = array_values(array_merge($keptGallery, $newGalleryPaths));
        foreach (array_diff($existingGallery, $keptGallery) as $removedPath) {
            $pathsToDelete[] = $removedPath;
        }

        $publication->gallery_paths = $finalGallery === [] ? null : $finalGallery;
        $publication->save();

        foreach (array_unique($pathsToDelete) as $path) {
            try {
                Storage::disk('public')->delete($path);
            } catch (\Throwable) {
                // Ignorar error de limpieza física para no fallar la respuesta.
            }
        }

        if ($isProject) {
            return response()->json(['project' => new ProjectResource($publication->fresh(['category:id,name', 'organization:id,name', 'needs']))]);
        }

        return response()->json(['community_need' => new CommunityNeedResource($publication->fresh(['category:id,name']))]);
    }
}
