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
            'interest_areas' => $this->interest_areas ?? [],
            'campus' => $this->campus,
            'semester' => $this->semester,
            'student_number' => $this->student_number,
            'expected_graduation' => $this->expected_graduation,
            'academic_role' => $this->academic_role,
            'organization_name' => $this->organization_name,
            'organization_area' => $this->organization_area,
            'organization_position' => $this->organization_position,
            'municipality' => $this->municipality,
            'locality' => $this->locality,
            'public_fields' => $this->public_fields ?? [],
            'affiliation_status' => $this->affiliation_status ?? 'current',
            'pending_affiliation' => $this->pending_affiliation ?? null,
            'affiliation_history' => $this->affiliation_history ?? [],
            'affiliation_rejection_reason' => $this->affiliation_rejection_reason,
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
