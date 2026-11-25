<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'project_need_id' => $this->project_need_id,
            'user_id' => $this->user_id,
            'message' => $this->message,
            'tipo_apoyo' => $this->support_type,
            'disponibilidad' => $this->availability,
            'expectativas' => $this->expectations,
            'portafolio_url' => $this->portfolio_url,
            'github_url' => $this->github_url,
            'linkedin_url' => $this->linkedin_url,
            'cv_url' => $this->cv_path ? Storage::disk('public')->url($this->cv_path) : null,
            'cv_original_name' => $this->cv_original_name,
            'status' => $this->status,
            'reviewed_by' => $this->reviewed_by,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'review_notes' => $this->review_notes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'title' => $this->project->title,
                'status' => $this->project->status,
                'organization_id' => $this->project->organization_id,
                'organization' => $this->project->relationLoaded('organization') && $this->project->organization
                    ? [
                        'id' => $this->project->organization->id,
                        'name' => $this->project->organization->name,
                    ]
                    : null,
            ]),
            'project_need' => $this->whenLoaded('projectNeed', fn () => $this->projectNeed ? [
                'id' => $this->projectNeed->id,
                'title' => $this->projectNeed->title,
                'required_profile' => $this->projectNeed->required_profile,
                'status' => $this->projectNeed->status,
            ] : null),
            'applicant' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'account_type' => $this->user->account_type,
                'profile_id' => $this->user->relationLoaded('profile') ? $this->user->profile?->id : null,
                'display_name' => $this->user->relationLoaded('profile') ? $this->user->profile?->display_name : null,
            ]),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id' => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ] : null),
            'project_member' => $this->whenLoaded('projectMember', fn () => $this->projectMember ? [
                'id' => $this->projectMember->id,
                'role' => $this->projectMember->role,
                'status' => $this->projectMember->status,
                'joined_at' => $this->projectMember->joined_at?->toISOString(),
            ] : null),
        ];
    }
}
