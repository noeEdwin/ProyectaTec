<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Application extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'project_id',
        'project_need_id',
        'user_id',
        'reviewed_by',
        'message',
        'support_type',
        'availability',
        'expectations',
        'portfolio_url',
        'github_url',
        'linkedin_url',
        'cv_path',
        'cv_original_name',
        'status',
        'reviewed_at',
        'review_notes',
    ];

    protected function casts(): array
    {
        return [
            'reviewed_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function projectNeed(): BelongsTo
    {
        return $this->belongsTo(ProjectNeed::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function projectMember(): HasOne
    {
        return $this->hasOne(ProjectMember::class);
    }
}