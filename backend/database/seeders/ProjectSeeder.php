<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        $projects = [
            [
                'title' => 'Plataforma de Manejo de Agua',
                'description' => 'Sistema web para el monitoreo y gestión de recursos hídricos en comunidades rurales de Oaxaca.',
                'status' => 'open',
                'organization' => 'EcoOaxaca A.C.',
                'category' => 'tecnologia',
            ],
            [
                'title' => 'Sistema de Gestión de Residuos',
                'description' => 'Aplicación móvil para coordinar rutas de reciclaje y recolección de basura electrónica.',
                'status' => 'in_progress',
                'organization' => 'TechSolutions del Sur',
                'category' => 'medio-ambiente',
            ],
            [
                'title' => 'Portal de Vinculación Universitaria',
                'description' => 'Red interna para conectar estudiantes con empresas locales para residencias profesionales.',
                'status' => 'open',
                'organization' => 'Instituto Tecnológico de Oaxaca',
                'category' => 'educacion',
            ],
            [
                'title' => 'Monitor Agrícola del Valle de Zimatlán',
                'description' => 'Plataforma de análisis de humedad de suelo y clima para pequeños productores de maíz.',
                'status' => 'open',
                'organization' => 'AgroInnovación de los Valles',
                'category' => 'medio-ambiente',
            ],
            [
                'title' => 'App de Expediente Médico Rural',
                'description' => 'Aplicación offline-first para registro de historial clínico de pacientes en brigadas lejanas.',
                'status' => 'in_progress',
                'organization' => 'Salud Comunitarias Oaxaca A.C.',
                'category' => 'salud',
            ],
            [
                'title' => 'Archivo Digital Zapoteco',
                'description' => 'Plataforma multimedia para la preservación auditiva e histórica del idioma zapoteco.',
                'status' => 'open',
                'organization' => 'Fundación Cultural Zaachila',
                'category' => 'cultura-y-arte',
            ],
            [
                'title' => 'Catálogo de Flora y Fauna Oaxaqueña',
                'description' => 'Base de datos biológica interactiva para investigadores y estudiantes de ciencias ambientales.',
                'status' => 'open',
                'organization' => 'CIIDIR Unidad Oaxaca - IPN',
                'category' => 'ciencia',
            ],
            [
                'title' => 'Dashboard de Métricas e Innovación',
                'description' => 'Panel para evaluar el crecimiento tecnológico y empleabilidad de graduados en el estado.',
                'status' => 'completed',
                'organization' => 'Clúster Tecnológico de Oaxaca',
                'category' => 'tecnologia',
            ],
        ];

        $user = User::where('email', 'test@example.com')->firstOrFail();

        foreach ($projects as $project) {
            $organization = Organization::where('name', $project['organization'])->firstOrFail();
            $category = Category::where('slug', $project['category'])->firstOrFail();
            unset($project['organization'], $project['category']);

            Project::updateOrCreate(
                ['title' => $project['title']],
                [
                    ...$project,
                    'organization_id' => $organization->id,
                    'category_id' => $category->id,
                    'created_by' => $user->id,
                ]
            );
        }
    }
}
