<?php
namespace Tests\Feature;

use App\Models\Category;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectMemberApiTest extends TestCase
{
    use RefreshDatabase;

    private function createProject(): Project
    {
        $owner = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'tecnologia-participantes',
        ]);

        return Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba',
            'description' => 'Seguimiento de participantes',
            'status' => 'open',
        ]);
    }

    private function addMember(
        Project $project,
        User $user,
        string $status = 'active'
    ): ProjectMember {
        return ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'role' => 'Colaborador',
            'status' => $status,
            'joined_at' => now(),
        ]);
    }

    public function test_public_can_list_active_members(): void
    {
        $project = $this->createProject();
        $active = User::factory()->create();
        $inactiveMember = User::factory()->create();
        $disabledUser = User::factory()->create([
            'is_active' => false,
        ]);

        $member = $this->addMember($project, $active);
        $this->addMember($project, $inactiveMember, 'inactive');
        $this->addMember($project, $disabledUser);

        $this->getJson("/api/projects/{$project->id}/members")
            ->assertOk()
            ->assertJsonCount(1, 'members')
            ->assertJsonPath('project_id', $project->id)
            ->assertJsonPath('members.0.id', $member->id)
            ->assertJsonPath('members.0.user.id', $active->id)
            ->assertJsonPath('members.0.role', 'Colaborador')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonMissingPath('members.0.user.email')
            ->assertJsonStructure([
                'members' => [
                    '*' => ['id', 'user', 'role', 'joined_at'],
                ],
                'meta' => [
                    'current_page',
                    'per_page',
                    'last_page',
                    'total',
                ],
            ]);
    }

    public function test_hidden_project_members_are_not_public(): void
    {
        $project = $this->createProject();
        $user = User::factory()->create();

        $this->addMember($project, $user);

        $project->is_hidden = true;
        $project->save();

        $this->getJson("/api/projects/{$project->id}/members")
            ->assertNotFound();
    }

    public function test_draft_project_members_are_not_public(): void
    {
        $project = $this->createProject();
        $user = User::factory()->create();

        $this->addMember($project, $user);

        $project->update([
            'status' => 'draft',
        ]);

        $this->getJson("/api/projects/{$project->id}/members")
            ->assertNotFound();
    }

    public function test_nonexistent_project_returns_404(): void
    {
        $this->getJson('/api/projects/999999/members')
            ->assertNotFound();
    }

    public function test_members_of_other_projects_are_not_included(): void
    {
        $project = $this->createProject();
        $anotherOwner = User::factory()->create();

        $otherProject = Project::create([
            'created_by' => $anotherOwner->id,
            'category_id' => $project->category_id,
            'title' => 'Otro proyecto',
            'description' => 'Proyecto diferente',
            'status' => 'open',
        ]);

        $otherUser = User::factory()->create();

        $this->addMember($otherProject, $otherUser);

        $this->getJson("/api/projects/{$project->id}/members")
            ->assertOk()
            ->assertJsonCount(0, 'members')
            ->assertJsonPath('meta.total', 0);
    }

    public function test_members_list_is_paginated(): void
    {
        $project = $this->createProject();

        for ($i = 0; $i < 16; $i++) {
            $user = User::factory()->create();
            $this->addMember($project, $user);
        }

        $this->getJson("/api/projects/{$project->id}/members")
            ->assertOk()
            ->assertJsonCount(15, 'members')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.total', 16);

        $this->getJson("/api/projects/{$project->id}/members?page=2")
            ->assertOk()
            ->assertJsonCount(1, 'members')
            ->assertJsonPath('meta.current_page', 2);
    }
}
