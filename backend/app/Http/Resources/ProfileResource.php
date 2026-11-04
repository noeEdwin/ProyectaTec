<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'is_organization' => false,
            // Reutilización de campos comunes exigida por el ticket
            'display_name' => $this->display_name,
            'description' => $this->description,
            'phone' => $this->phone,
            'location' => $this->location,
            'institution' => $this->institution,
            'field_of_study' => $this->field_of_study,
            'image' => $this->avatar_path,
            'image_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            // Datos que viven en la tabla users (si la relación está cargada)
            'email' => $this->whenLoaded('user', fn () => $this->user->email),
            'account_type' => $this->whenLoaded('user', fn () => $this->user->account_type),
            'contact' => [
                'phone' => $this->phone,
                // Podemos extraer el email de la relación con User si está cargada
                'email' => $this->whenLoaded('user', fn () => $this->user->email),
            ],
            // Campos específicos agrupados
            'classification' => trim($this->institution.' '.$this->field_of_study),
            'created_at' => $this->created_at,
        ];
    }
}