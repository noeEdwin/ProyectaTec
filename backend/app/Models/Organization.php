<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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
        'public_fields',
        'approval_status',
        'rejection_reason',
        'legal_name',
        'website',
    ];

    protected function casts(): array
    {
        return ['public_fields' => 'array'];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'organization_members'
        )
            ->withPivot([
                'role',
                'status',
                'joined_at',
            ])
            ->withTimestamps();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Busca una institución educativa existente (aprobada o pendiente) por nombre
     * o crea una nueva en estado pendiente para revisión administrativa.
     *
     * @param  array{website?: ?string, location?: ?string, email?: ?string}  $extra
     * @return array{0: self, 1: bool} [organización, si ya está aprobada]
     */
    public static function resolveOrRequestInstitution(string $name, array $extra = []): array
    {
        $normalized = trim($name);
        $existing = self::query()
            ->where('organization_type', 'institucion_educativa')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($normalized)])
            ->first();

        if ($existing) {
            if ($existing->approval_status === 'rejected') {
                $existing->update([
                    'approval_status' => 'pending',
                    'rejection_reason' => null,
                    'website' => $extra['website'] ?? $existing->website,
                    'location' => $extra['location'] ?? $existing->location,
                    'email' => $extra['email'] ?? $existing->email,
                ]);
            }

            return [$existing, $existing->approval_status === 'approved'];
        }

        $created = self::create([
            'name' => $normalized,
            'organization_type' => 'institucion_educativa',
            'sector' => 'Educación y capacitación',
            'website' => $extra['website'] ?? null,
            'location' => $extra['location'] ?? null,
            'email' => $extra['email'] ?? null,
            'approval_status' => 'pending',
        ]);

        return [$created, false];
    }
}
