<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ProjectMember;
use Illuminate\Database\Seeder;

class ProjectMemberSeeder extends Seeder
{
    public function run(): void
    {
        $application = Application::whereHas('project', function ($query) {
            $query->where('title', 'Sistema de Gestión de Residuos');
        })
            ->where('status', 'accepted')
            ->firstOrFail();

        ProjectMember::updateOrCreate(['application_id' => $application->id], [
            'project_id' => $application->project_id,
            'user_id' => $application->user_id,
            'role' => 'UI/UX Designer',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }
}
