<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProjectUpdateSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('project_updates')->insert([
            'project_id' => 1, // Plataforma de Manejo de Agua
            'created_by' => 1,
            'title' => 'Inicio de la Fase de Diseño y Arquitectura',
            'description' => 'Se han definido los requerimientos iniciales con la comunidad y el diagrama E-R de la base de datos.',
            'progress' => 25,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}