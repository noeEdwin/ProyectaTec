<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Project;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $projects = [
            [
                'title' => 'Plataforma de Manejo de Agua',
                'description' => 'Sistema web para el monitoreo y gestión de recursos hídricos en comunidades rurales de Oaxaca.',
                'status' => 'open',
                'organization_id' => 2,
                'category_id' => 1,
                'created_by' => 1,
            ],
            [
                'title' => 'Sistema de Gestión de Residuos',
                'description' => 'Aplicación móvil para coordinar rutas de reciclaje y recolección de basura electrónica.',
                'status' => 'in_progress',
                'organization_id' => 3,
                'category_id' => 2,
                'created_by' => 1,
            ],
            [
                'title' => 'Portal de Vinculación Universitaria',
                'description' => 'Red interna para conectar estudiantes con empresas locales para residencias profesionales.',
                'status' => 'open',
                'organization_id' => 1,
                'category_id' => 3,
                'created_by' => 1,
            ]
        ];

        foreach ($projects as $project) {
            Project::create($project);
        }
    }
}