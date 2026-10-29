<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'is_organization' => false,
            // Reutilización de campos comunes exigida por el ticket
            'name' => $this->display_name,
            'description' => $this->description,
            'location' => $this->location,
            'image' => $this->avatar_path,
            'contact' => [
                'phone' => $this->phone,
                // Podemos extraer el email de la relación con User si está cargada
                'email' => $this->whenLoaded('user', fn() => $this->user->email)
            ],
            // Campos específicos agrupados
            'classification' => trim($this->institution . ' ' . $this->field_of_study),
            'created_at' => $this->created_at,
        ];
    }
}