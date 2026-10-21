<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'organization_type',
        'description',
        'sector',
        'email',
        'phone',
        'location',
        'logo_path',
    ];

    public function memberships(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }
    public function members(): HasMany
    {
    	return $this->hasMany(OrganizationMember::class, 'organization_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }
}