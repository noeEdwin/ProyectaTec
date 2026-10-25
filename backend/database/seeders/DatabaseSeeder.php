<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // 1. Catálogos base
        $this->call([
            CategorySeeder::class,
        ]);

        // 2. Usuarios
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => 'password',
                'account_type' => 'student',
                'is_active' => true,
            ]
        );
        User::firstOrCreate(
            ['email' => 'reviewer@example.com'],
            [
                'name' => 'Project Reviewer',
                'password' => 'password',
                'account_type' => 'organization',
                'is_active' => true,
            ]
        );

        // 3. Perfil del usuario
        $this->call([
            ProfileSeeder::class,
        ]);

        // 4. Organizaciones y Miembros
        $this->call([
            OrganizationSeeder::class,
            OrganizationMemberSeeder::class,
        ]);

        // 5. Proyectos y Necesidades
        $this->call([
            ProjectSeeder::class,
            NeedSeeder::class,
        ]);

        // 6. Aplicaciones y Miembros de Proyecto
        $this->call([
            ApplicationSeeder::class,
            ProjectMemberSeeder::class,
        ]);

        // 7. Actualizaciones, Comentarios y Archivos
        $this->call([
            ProjectUpdateSeeder::class,
            ProjectCommentSeeder::class,
            ProjectFileSeeder::class,
        ]);

        // 8. Notificaciones
        $this->call([
            NotificationSeeder::class,
        ]);
    }
}
