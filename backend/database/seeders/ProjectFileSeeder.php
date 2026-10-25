<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProjectFileSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('project_files')->insert([
            'project_id' => 1,
            'project_update_id' => 1,
            'uploaded_by' => 1,
            'original_name' => 'requerimientos_proyecto_agua.pdf',
            'file_path' => 'projects/files/requerimientos_proyecto_agua.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 1048576, // 1 MB
            'created_at' => now(),
        ]);
    }
}