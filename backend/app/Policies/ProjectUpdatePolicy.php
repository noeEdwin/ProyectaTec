<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\ProjectUpdate;
use App\Models\User;

class ProjectUpdatePolicy
{
    public function viewAny(User $user, Project $project): bool
    {
        return $this->isPlatformAdmin($user) || $this->canWrite($user, $project);
    }

    public function view(User $user, ProjectUpdate $update): bool
    {
        return $update->project !== null && ($this->isPlatformAdmin($user) || $this->canWrite($user, $update->project));
    }

    public function create(User $user, Project $project): bool
    {
        return $this->canWrite($user, $project);
    }

    public function update(User $user, ProjectUpdate $update): bool
    {
        return $update->project !== null && $this->canWrite($user, $update->project);
    }

    private function isPlatformAdmin(User $user): bool
    {
        return $user->is_active && in_array(
            strtolower($user->email),
            array_map('strtolower', config('services.proyectatec.admin_emails', [])),
            true
        );
    }

    private function canWrite(User $user, Project $project): bool
    {
        if (! $user->is_active || ($project->organization_id !== null && $project->organization?->approval_status !== 'approved')) {
            return false;
        }

        if ((int) $project->created_by === (int) $user->id) {
            return true;
        }

        if ($project->organization_id !== null && $project->organization->memberships()
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->where('status', 'active')
            ->exists()) {
            return true;
        }

        return $project->members()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();
    }
}
