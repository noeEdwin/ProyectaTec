<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrganizationResource extends JsonResource
{
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