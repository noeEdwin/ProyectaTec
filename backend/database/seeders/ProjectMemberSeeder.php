<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProjectMemberSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('project_members')->insert([
            'project_id' => 2, // Sistema de Gestión de Residuos
            'user_id' => 1,
            'application_id' => 2, // Postulación aceptada previa
            'role' => 'UI/UX Designer',
            'status' => 'active',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}