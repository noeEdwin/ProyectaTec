<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\Project;
use App\Models\ProjectNeed;
use App\Models\User;
use Illuminate\Database\Seeder;

class ApplicationSeeder extends Seeder
{
    public function run(): void
    {
        $applications = [
            [
                'project' => 'Plataforma de Manejo de Agua',
                'need' => 'Desarrollador Frontend (React)',
                'message' => '¡Hola! Tengo experiencia con React y TypeScript, me encantaría participar en este proyecto.',
                'status' => 'pending',
            ],
            [
                'project' => 'Sistema de Gestión de Residuos',
                'need' => 'Diseñador UI/UX (Figma)',
                'reviewed' => true,
                'message' => 'He trabajado con Figma antes y me interesa el diseño UI/UX para aplicaciones móviles.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
            [
                'project' => 'Portal de Vinculación Universitaria',
                'need' => 'Desarrollador Backend (Laravel)',
                'message' => 'Cuento con experiencia construyendo APIs RESTful en Laravel y bases de datos PostgreSQL.',
                'status' => 'pending',
            ],
            [
                'project' => 'Monitor Agrícola del Valle de Zimatlán',
                'need' => 'Especialista en IoT y Sensores',
                'reviewed' => true,
                'message' => 'Tengo proyectos previos con microcontroladores ESP32 y sensores de humedad DHT22.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
            [
                'project' => 'App de Expediente Médico Rural',
                'need' => 'Desarrollador Mobile (Flutter)',
                'reviewed' => true,
                'message' => 'Me interesa la arquitectura offline-first en Flutter usando SQLite.',
                'status' => 'rejected',
                'reviewed_at' => now(),
            ],
            [
                'project' => 'Archivo Digital Zapoteco',
                'need' => 'Digitalizador y Editor de Audio',
                'message' => 'Manejo herramientas de edición de audio como Audacity y Adobe Audition.',
                'status' => 'pending',
            ],
            [
                'project' => 'Catálogo de Flora y Fauna Oaxaqueña',
                'need' => 'Analista de Datos y Clasificación',
                'reviewed' => true,
                'message' => 'Sé usar Pandas y Python para limpieza de datos y estructuración de JSONs.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
            [
                'project' => 'Dashboard de Métricas e Innovación',
                'need' => 'QA Tester y Control de Calidad',
                'reviewed' => true,
                'message' => 'He realizado pruebas de integración y automatización básica con Postman.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
        ];

        $applicant = User::where('email', 'test@example.com')->firstOrFail();
        $reviewer = User::where('email', 'reviewer@example.com')->firstOrFail();

        foreach ($applications as $attributes) {
            $project = Project::where('title', $attributes['project'])->firstOrFail();
            $need = ProjectNeed::where('project_id', $project->id)
                ->where('title', $attributes['need'])
                ->firstOrFail();
            $reviewed = $attributes['reviewed'] ?? false;
            unset($attributes['project'], $attributes['need'], $attributes['reviewed']);

            if ($reviewed) {
                $attributes['reviewed_by'] = $reviewer->id;
                $attributes['reviewed_at'] = $attributes['reviewed_at'] ?? now();
            }

            Application::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'project_need_id' => $need->id,
                    'user_id' => $applicant->id,
                ],
                $attributes
            );
        }
    }
}
