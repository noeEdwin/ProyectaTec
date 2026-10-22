<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProjectNeed;
use App\Models\CommunityNeed;

class NeedSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Necesidades específicas de Proyectos
        $projectNeeds = [
            [
                'project_id' => 1, // Plataforma de Manejo de Agua
                'title' => 'Desarrollador Frontend (React)',
                'description' => 'Buscamos un estudiante con conocimientos en React y TypeScript para construir la interfaz.',
                'required_profile' => 'Frontend Developer',
                'openings' => 2,
                'status' => 'open'
            ],
            [
                'project_id' => 2, // Sistema de Gestión de Residuos
                'title' => 'Diseñador UI/UX (Figma)',
                'description' => 'Se requiere apoyo para diseñar los prototipos y pantallas de la aplicación móvil en Figma.',
                'required_profile' => 'UI/UX Designer',
                'openings' => 1,
                'status' => 'open'
            ],
            [
                'project_id' => 3, // Portal de Vinculación Universitaria
                'title' => 'Desarrollador Backend (Laravel)',
                'description' => 'Necesitamos apoyo en la creación de la API y manejo de PostgreSQL.',
                'required_profile' => 'Backend Developer',
                'openings' => 1,
                'status' => 'open'
            ]
        ];

        foreach ($projectNeeds as $need) {
            ProjectNeed::create($need);
        }

        // 2. Necesidades Comunitarias
        $communityNeeds = [
            [
                'created_by' => 1,  // Test User
                'category_id' => 3, // Medio ambiente
                'title' => 'Mantenimiento de áreas verdes y reforestación',
                'description' => 'El parque requiere limpieza general, poda y plantación de nuevos árboles nativos.',
                'location' => 'Parque El Llano, Oaxaca',
                'status' => 'open'
            ],
            [
                'created_by' => 1,  // Test User
                'category_id' => 1, // Tecnología
                'title' => 'Mejora de red local comunitaria',
                'description' => 'Se necesita apoyo para configurar routers y mejorar la conexión a internet en el centro comunitario.',
                'location' => 'San Martín Mexicapam, Oaxaca',
                'status' => 'open'
            ]
        ];

        foreach ($communityNeeds as $communityNeed) {
            CommunityNeed::create($communityNeed);
        }
    }
}