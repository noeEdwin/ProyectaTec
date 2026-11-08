<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Project $project): bool
    {
        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        if (in_array($user->account_type, ['organizacion', 'organization', 'empresa', 'institucion_educativa', 'sector_social'], true)) {
            return $user->organizations()
                ->wherePivot('role', 'admin')
                ->wherePivot('status', 'active')
                ->where('organizations.approval_status', 'approved')
                ->exists();
        }

        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Project $project): bool
    {
        if ($project->organization_id !== null && $project->organization?->approval_status !== 'approved') {
            return false;
        }

        if ((int) $project->created_by === (int) $user->id) {
            return true;
        }

        return $project->organization_id !== null
            && $project->organization->memberships()
                ->where('user_id', $user->id)
                ->where('role', 'admin')
                ->where('status', 'active')
                ->exists();
    }

    public function addNeed(User $user, Project $project): bool
    {
        return (int) $project->created_by === (int) $user->id
            && ($project->organization_id === null || $project->organization?->approval_status === 'approved');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Project $project): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Project $project): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Project $project): bool
    {
        return false;
    }
}
