<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Project extends Model
{
    protected $fillable = [
        'created_by',
        'organization_id',
        'category_id',
        'title',
        'description',
        'status',
        'modality',
        'location',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function needs(): HasMany
    {
        return $this->hasMany(ProjectNeed::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }
    public function users(): BelongsToMany
{
    return $this->belongsToMany(
        User::class,
        'project_members'
    )
        ->withPivot([
            'application_id',
            'role',
            'status',
            'joined_at',
        ])
        ->withTimestamps();
}

    public function updates(): HasMany
    {
        return $this->hasMany(ProjectUpdate::class);
    }

    public function files(): HasMany
    {
        return $this->hasMany(ProjectFile::class);
    }
}