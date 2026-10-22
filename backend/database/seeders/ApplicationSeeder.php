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
            ]
        ];

        foreach ($applications as $application) {
            Application::create($application);
        }
    }
}