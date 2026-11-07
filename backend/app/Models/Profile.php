<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'display_name',
        'description',
        'phone',
        'location',
        'avatar_path',
        'institution',
        'field_of_study',
        'interest_areas',
        'campus',
        'semester',
        'student_number',
        'expected_graduation',
        'academic_role',
        'organization_name',
        'organization_id',
        'organization_area',
        'organization_position',
        'municipality',
        'locality',
        'public_fields',
        'pending_affiliation',
        'affiliation_status',
        'affiliation_history',
        'affiliation_rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'public_fields' => 'array',
            'interest_areas' => 'array',
            'pending_affiliation' => 'array',
            'affiliation_history' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
