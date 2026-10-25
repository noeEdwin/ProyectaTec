<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\Notifications\ProjectApplicationStatusChanged',
            'notifiable_type' => 'App\Models\User',
            'notifiable_id' => 1,
            'data' => json_encode([
                'title' => 'Postulación Aceptada',
                'message' => 'Tu solicitud para el proyecto "Sistema de Gestión de Residuos" fue aceptada.',
            ]),
            'read_at' => null,
            'created_at' => now(),
        ]);
    }
}