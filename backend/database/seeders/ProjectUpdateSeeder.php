<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectUpdateSeeder extends Seeder
{
    public function run(): void
    {
        $project = Project::where('title', 'Plataforma de Manejo de Agua')->firstOrFail();
        $creator = User::where('email', 'test@example.com')->firstOrFail();

        ProjectUpdate::updateOrCreate([
            'project_id' => $project->id,
            'title' => 'Inicio de la Fase de Diseño y Arquitectura',
        ], [
            'created_by' => $creator->id,
            'title' => 'Inicio de la Fase de Diseño y Arquitectura',
            'description' => 'Se han definido los requerimientos iniciales con la comunidad y el diagrama E-R de la base de datos.',
            'progress' => 25,
        ]);
    }
}
