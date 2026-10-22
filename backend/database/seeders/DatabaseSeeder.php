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
        // 1. Crear las categorías iniciales.
        $this->call([
            CategorySeeder::class,
        ]);

        // 2. Crear un usuario de prueba (que usaremos en las postulaciones).
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // 3. Ejecutar tus nuevos seeders en orden estricto.
        $this->call([
            OrganizationSeeder::class,
            ProjectSeeder::class,
            NeedSeeder::class,
            ApplicationSeeder::class,
        ]);
    }
}