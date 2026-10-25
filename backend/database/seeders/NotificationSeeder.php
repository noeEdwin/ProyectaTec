<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'test@example.com')->firstOrFail();
        $type = 'App\\Notifications\\ProjectApplicationStatusChanged';
        $data = json_encode([
            'title' => 'Postulación Aceptada',
            'message' => 'Tu solicitud para el proyecto "Sistema de Gestión de Residuos" fue aceptada.',
        ]);

        $exists = DB::table('notifications')
            ->where('type', $type)
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $user->id)
            ->where('data', $data)
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => $type,
            'notifiable_type' => User::class,
            'notifiable_id' => $user->id,
            'data' => $data,
            'read_at' => null,
            'created_at' => now(),
        ]);
    }
}
