<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProjectCommentSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('project_comments')->insert([
            'project_update_id' => 1,
            'user_id' => 1,
            'content' => 'Excelente avance. La siguiente semana revisaremos los prototipos de las vistas principales.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}