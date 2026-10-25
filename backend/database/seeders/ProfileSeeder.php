<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProfileSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('profiles')->insert([
            'user_id' => 1,
            'display_name' => 'Test User',
            'description' => 'Estudiante de Ingeniería en Sistemas apasionado por el desarrollo web y móvil.',
            'phone' => '9511234567',
            'location' => 'Oaxaca, México',
            'avatar_path' => null,
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas Computacionales',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}