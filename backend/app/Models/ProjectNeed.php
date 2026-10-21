<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectNeed extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'description',
        'required_profile',
        'openings',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'openings' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
}