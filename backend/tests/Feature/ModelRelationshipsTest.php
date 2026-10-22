<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Profile;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;
use Tests\TestCase;

class ModelRelationshipsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_organization_and_project_relationships_use_real_records(): void
    {
        $user = User::create([
            'name' => 'Student User',
            'email' => 'student@example.com',
            'password' => 'password',
            'account_type' => 'student',
            'is_active' => true,
        ]);
        $profile = Profile::create([
            'user_id' => $user->id,
            'display_name' => 'Student User',
        ]);
        $organization = Organization::create([
            'name' => 'Community Organization',
            'organization_type' => 'ngo',
        ]);
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => 'member',
            'status' => 'active',
        ]);
        $category = Category::create([
            'name' => 'Education',
            'slug' => 'education',
        ]);
        $project = Project::create([
            'created_by' => $user->id,
            'organization_id' => $organization->id,
            'category_id' => $category->id,
            'title' => 'Community Project',
            'description' => 'Project description',
            'status' => 'draft',
        ]);
        $reviewer = User::create([
            'name' => 'Reviewer User',
            'email' => 'reviewer@example.com',
            'password' => 'password',
            'account_type' => 'organization',
            'is_active' => true,
        ]);
        $application = Application::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'reviewed_by' => $reviewer->id,
            'status' => 'approved',
        ]);
        $projectMember = ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'application_id' => $application->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $manualUser = User::create([
            'name' => 'Manual Member',
            'email' => 'manual@example.com',
            'password' => 'password',
            'account_type' => 'student',
            'is_active' => true,
        ]);
        $manualMember = ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $manualUser->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->assertTrue($user->profile->is($profile));
        $this->assertTrue($user->organizations->contains($organization));
        $this->assertTrue($organization->users->contains($user));
        $this->assertTrue($user->memberProjects->contains($project));
        $this->assertTrue($project->users->contains($user));
        $this->assertTrue($application->projectMember->is($projectMember));
        $this->assertTrue($reviewer->reviewedApplications->contains($application));
        $this->assertNull($manualMember->application_id);
    }

    public function test_one_application_can_create_only_one_project_member(): void
    {
        $user = User::create([
            'name' => 'Student User',
            'email' => 'student@example.com',
            'password' => 'password',
            'account_type' => 'student',
            'is_active' => true,
        ]);
        $category = Category::create([
            'name' => 'Education',
            'slug' => 'education',
        ]);
        $project = Project::create([
            'created_by' => $user->id,
            'category_id' => $category->id,
            'title' => 'Community Project',
            'description' => 'Project description',
            'status' => 'draft',
        ]);
        $application = Application::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'status' => 'approved',
        ]);
        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'application_id' => $application->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->expectException(QueryException::class);

        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => User::create([
                'name' => 'Another User',
                'email' => 'another@example.com',
                'password' => 'password',
                'account_type' => 'student',
                'is_active' => true,
            ])->id,
            'application_id' => $application->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }
}
