<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\User;

class ApplicationPolicy
{
    public function viewAny(User $user): bool
    {
        return (bool) $user->is_active;
    }

    public function view(User $user, Application $application): bool
    {
        if ((int) $application->user_id === (int) $user->id) {
            return true;
        }

        $project = $application->project;

        return $project !== null && $this->canManageProject($user, $project);
    }

    public function create(User $user): bool
    {
        return (bool) $user->is_active;
    }

    public function viewProjectApplications(User $user, Project $project): bool
    {
        return $this->canManageProject($user, $project);
    }

    public function update(User $user, Application $application): bool
    {
        $project = $application->project;

        return $project !== null && $this->canManageProject($user, $project);
    }

    public function canManageProject(User $user, Project $project): bool
    {
        if ($project->organization_id !== null && $project->organization?->approval_status !== 'approved') {
            return false;
        }

        if ((int) $project->created_by === (int) $user->id) {
            return true;
        }

        if (! $project->organization_id) {
            return false;
        }

        return OrganizationMember::query()
            ->where('organization_id', $project->organization_id)
            ->where('user_id', $user->id)
            ->where('role', 'admin')
            ->where('status', 'active')
            ->exists();
    }

    public function delete(User $user, Application $application): bool
    {
        return false;
    }

    public function restore(User $user, Application $application): bool
    {
        return false;
    }

    public function forceDelete(User $user, Application $application): bool
    {
        return false;
    }
}
