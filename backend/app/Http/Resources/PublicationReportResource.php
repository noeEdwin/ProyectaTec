<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicationReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reporter_id' => $this->reporter_id,
            'project_id' => $this->project_id,
            'community_need_id' => $this->community_need_id,
            'reason' => $this->reason,
            'details' => $this->details,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
