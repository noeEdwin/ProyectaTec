<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicationReport extends Model
{
    protected $fillable = [
        'reporter_id',
        'project_id',
        'community_need_id',
        'reason',
        'details',
        'status',
    ];

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function communityNeed(): BelongsTo
    {
        return $this->belongsTo(CommunityNeed::class);
    }
}
