<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'account_type',
        'is_active',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class);
    }

    public function createdProjects(): HasMany
    {
        return $this->hasMany(Project::class, 'created_by');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'created_by');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
    public function reviewedApplications(): HasMany
{
    return $this->hasMany(
        Application::class,
        'reviewed_by'
    );
}

    public function organizationMemberships(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(
            Organization::class,
            'organization_members'
        )
            ->withPivot([
                'role',
                'status',
                'joined_at',
            ])
            ->withTimestamps();
    }

    public function projectMemberships(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }
    public function memberProjects(): BelongsToMany
{
    return $this->belongsToMany(
        Project::class,
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

    public function communityNeeds(): HasMany
    {
        return $this->hasMany(CommunityNeed::class, 'created_by');
    }

    public function projectUpdates(): HasMany
    {
        return $this->hasMany(ProjectUpdate::class, 'created_by');
    }

    public function projectComments(): HasMany
    {
        return $this->hasMany(ProjectComment::class);
    }

    public function uploadedProjectFiles(): HasMany
    {
        return $this->hasMany(ProjectFile::class, 'uploaded_by');
    }
}

