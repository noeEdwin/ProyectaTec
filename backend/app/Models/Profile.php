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
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}