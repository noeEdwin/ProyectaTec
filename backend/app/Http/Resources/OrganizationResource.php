<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class OrganizationResource extends JsonResource
{
    public static function logoUrl(?string $path): ?string
    {
        if ($path === null || $path === '' || str_starts_with($path, '/') ||
            preg_match('~[\\\\?#\x00-\x1F\x7F]|(^|/)\.{1,2}(/|$)|^[A-Za-z][A-Za-z0-9+.-]*:~', $path)) {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'is_organization' => true,
            // Reutilización de campos comunes
            'name' => $this->name,
            'description' => $this->description,
            'location' => $this->location,
            'image' => $this->logo_path,
            'image_url' => self::logoUrl($this->logo_path),
            'contact' => [
                'phone' => $this->phone,
                'email' => $this->email,
            ],
            // Campos específicos agrupados
            'classification' => trim($this->organization_type . ' - ' . $this->sector),
            'created_at' => $this->created_at,
        ];
    }
}
