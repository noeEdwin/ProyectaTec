<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Application;

class ApplicationSeeder extends Seeder
{
    public function run(): void
    {
        $applications = [
            [
                'project_id' => 1,
                'project_need_id' => 1,
                'user_id' => 1,
                'message' => '¡Hola! Tengo experiencia con React y TypeScript, me encantaría participar en este proyecto.',
                'status' => 'pending',
            ],
            [
                'project_id' => 2,
                'project_need_id' => 2,
                'user_id' => 1,
                'reviewed_by' => 1,
                'message' => 'He trabajado con Figma antes y me interesa el diseño UI/UX para aplicaciones móviles.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
            [
                'project_id' => 3,
                'project_need_id' => 3,
                'user_id' => 1,
                'message' => 'Cuento con experiencia construyendo APIs RESTful en Laravel y bases de datos PostgreSQL.',
                'status' => 'pending',
            ],
            [
                'project_id' => 4,
                'project_need_id' => 4,
                'user_id' => 1,
                'reviewed_by' => 1,
                'message' => 'Tengo proyectos previos con microcontroladores ESP32 y sensores de humedad DHT22.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
            [
                'project_id' => 5,
                'project_need_id' => 5,
                'user_id' => 1,
                'reviewed_by' => 1,
                'message' => 'Me interesa la arquitectura offline-first en Flutter usando SQLite.',
                'status' => 'rejected',
                'reviewed_at' => now(),
            ],
            [
                'project_id' => 6,
                'project_need_id' => 6,
                'user_id' => 1,
                'message' => 'Manejo herramientas de edición de audio como Audacity y Adobe Audition.',
                'status' => 'pending',
            ],
            [
                'project_id' => 7,
                'project_need_id' => 7,
                'user_id' => 1,
                'reviewed_by' => 1,
                'message' => 'Sé usar Pandas y Python para limpieza de datos y estructuración de JSONs.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
            [
                'project_id' => 8,
                'project_need_id' => 8,
                'user_id' => 1,
                'reviewed_by' => 1,
                'message' => 'He realizado pruebas de integración y automatización básica con Postman.',
                'status' => 'accepted',
                'reviewed_at' => now(),
            ],
        ];

        foreach ($applications as $application) {
            Application::create($application);
        }
    }
}