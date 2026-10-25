<?php

namespace Database\Seeders;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProfileSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'test@example.com')->firstOrFail();

        Profile::updateOrCreate(['user_id' => $user->id], [
            'display_name' => 'Test User',
            'description' => 'Estudiante de Ingeniería en Sistemas apasionado por el desarrollo web y móvil.',
            'phone' => '9511234567',
            'location' => 'Oaxaca, México',
            'avatar_path' => null,
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas Computacionales',
        ]);
    }
}
