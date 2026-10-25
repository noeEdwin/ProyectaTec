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
            ],
            [
                'title' => 'Monitor Agrícola del Valle de Zimatlán',
                'description' => 'Plataforma de análisis de humedad de suelo y clima para pequeños productores de maíz.',
                'status' => 'open',
                'organization_id' => 7,
                'category_id' => 1,
                'created_by' => 1,
            ],
            [
                'title' => 'App de Expediente Médico Rural',
                'description' => 'Aplicación offline-first para registro de historial clínico de pacientes en brigadas lejanas.',
                'status' => 'in_progress',
                'organization_id' => 8,
                'category_id' => 1,
                'created_by' => 1,
            ],
            [
                'title' => 'Archivo Digital Zapoteco',
                'description' => 'Plataforma multimedia para la preservación auditiva e histórica del idioma zapoteco.',
                'status' => 'open',
                'organization_id' => 6,
                'category_id' => 3,
                'created_by' => 1,
            ],
            [
                'title' => 'Catálogo de Flora y Fauna Oaxaqueña',
                'description' => 'Base de datos biológica interactiva para investigadores y estudiantes de ciencias ambientales.',
                'status' => 'open',
                'organization_id' => 4,
                'category_id' => 2,
                'created_by' => 1,
            ],
            [
                'title' => 'Dashboard de Métricas e Innovación',
                'description' => 'Panel para evaluar el crecimiento tecnológico y empleabilidad de graduados en el estado.',
                'status' => 'completed',
                'organization_id' => 5,
                'category_id' => 1,
                'created_by' => 1,
            ],
        ];

        foreach ($projects as $project) {
            Project::create($project);
        }
    }
}