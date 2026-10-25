<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Illuminate\Database\Seeder;

class OrganizationMemberSeeder extends Seeder
{
    public function run(): void
    {
        $organization = Organization::where('name', 'Instituto Tecnológico de Oaxaca')->firstOrFail();
        $user = User::where('email', 'test@example.com')->firstOrFail();

        OrganizationMember::updateOrCreate([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
        ], [
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }
}
