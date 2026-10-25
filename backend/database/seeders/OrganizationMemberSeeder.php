<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrganizationMemberSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('organization_members')->insert([
            'organization_id' => 1, // Instituto Tecnológico de Oaxaca
            'user_id' => 1,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}