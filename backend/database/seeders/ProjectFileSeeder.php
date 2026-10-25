<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectFileSeeder extends Seeder
{
    public function run(): void
    {
        $project = Project::where('title', 'Plataforma de Manejo de Agua')->firstOrFail();
        $update = ProjectUpdate::where('project_id', $project->id)->firstOrFail();
        $uploader = User::where('email', 'test@example.com')->firstOrFail();

        ProjectFile::updateOrCreate([
            'file_path' => 'projects/files/requerimientos_proyecto_agua.pdf',
        ], [
            'project_id' => $project->id,
            'project_update_id' => $update->id,
            'uploaded_by' => $uploader->id,
            'original_name' => 'requerimientos_proyecto_agua.pdf',
            'file_path' => 'projects/files/requerimientos_proyecto_agua.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1048576, // 1 MB
        ]);
    }
}
