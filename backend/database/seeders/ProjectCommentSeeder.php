<?php

namespace Database\Seeders;

use App\Models\ProjectComment;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectCommentSeeder extends Seeder
{
    public function run(): void
    {
        $update = ProjectUpdate::where('title', 'Inicio de la Fase de Diseño y Arquitectura')->firstOrFail();
        $user = User::where('email', 'test@example.com')->firstOrFail();

        ProjectComment::updateOrCreate([
            'project_update_id' => $update->id,
            'user_id' => $user->id,
        ], [
            'content' => 'Excelente avance. La siguiente semana revisaremos los prototipos de las vistas principales.',
        ]);
    }
}
