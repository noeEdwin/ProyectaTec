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
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

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