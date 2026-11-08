<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicationEditingTest extends TestCase
{
    use RefreshDatabase;

    private function category(): Category
    {
        return Category::create(['name' => 'Innovación', 'slug' => 'innovacion-publicaciones']);
    }

    private function project(User $owner, Category $category, ?Organization $organization = null): Project
    {
        return Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'organization_id' => $organization?->id,
            'title' => 'Proyecto original',
            'description' => 'Descripción original',
            'status' => 'open',
            'starts_at' => '2027-01-01',
            'ends_at' => '2027-05-01',
        ]);
    }

    private function communityNeed(User $owner, Category $category): CommunityNeed
    {
        return CommunityNeed::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Necesidad original',
            'description' => 'Descripción original',
            'status' => 'open',
        ]);
    }

    public function test_author_edits_project_and_closes_it_without_removing_applications(): void
    {
        $owner = User::factory()->create();
        $applicant = User::factory()->create();
        $category = $this->category();
        $project = $this->project($owner, $category);
        $application = Application::create([
            'project_id' => $project->id,
            'user_id' => $applicant->id,
            'status' => 'pending',
        ]);

        $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'title' => 'Proyecto editado',
            'description' => 'Nueva descripción',
            'modality' => 'Híbrida',
            'location' => 'Oaxaca, México',
            'starts_at' => '2027-02-01',
            'ends_at' => '2027-06-01',
            'status' => 'in_progress',
        ])->assertOk()
            ->assertJsonPath('project.title', 'Proyecto editado')
            ->assertJsonPath('project.status', 'in_progress')
            ->assertJsonMissingPath('project.created_by');

        $this->patchJson("/api/projects/{$project->id}", ['status' => 'completed'])
            ->assertOk()->assertJsonPath('project.status', 'completed');
        $this->patchJson("/api/projects/{$project->id}", ['status' => 'closed'])
            ->assertOk()->assertJsonPath('project.status', 'closed');

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'title' => 'Proyecto editado',
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'status' => 'closed',
        ]);
        $this->assertDatabaseHas('applications', ['id' => $application->id, 'project_id' => $project->id]);
        $this->getJson("/api/projects/{$project->id}")->assertNotFound();
        $this->getJson('/api/projects')->assertJsonCount(0, 'projects');
    }

    public function test_organization_admin_can_edit_project_from_another_author_but_members_cannot(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $member = User::factory()->create();
        $inactiveAdmin = User::factory()->create();
        $outsider = User::factory()->create();
        $organization = Organization::create([
            'name' => 'Empresa', 'organization_type' => 'empresa', 'approval_status' => 'approved',
        ]);
        foreach ([[$admin, 'admin', 'active'], [$member, 'member', 'active'], [$inactiveAdmin, 'admin', 'inactive']] as [$user, $role, $status]) {
            $organization->memberships()->create(['user_id' => $user->id, 'role' => $role, 'status' => $status]);
        }
        $project = $this->project($owner, $this->category(), $organization);

        $this->patchJson("/api/projects/{$project->id}", ['status' => 'withdrawn'])->assertUnauthorized();
        foreach ([$member, $inactiveAdmin, $outsider] as $user) {
            $this->actingAs($user, 'sanctum')->patchJson("/api/projects/{$project->id}", [
                'title' => '', 'status' => 'withdrawn',
            ])->assertForbidden();
        }

        $this->actingAs($admin, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'status' => 'withdrawn',
        ])->assertOk()->assertJsonPath('project.status', 'withdrawn');
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'created_by' => $owner->id, 'status' => 'withdrawn']);
        $this->getJson("/api/projects/{$project->id}")->assertNotFound();

        $this->patchJson("/api/projects/{$project->id}", ['status' => 'open'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_project_rejects_immutable_fields_invalid_changes_and_backward_transitions(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner, $this->category());
        $this->actingAs($owner, 'sanctum');

        foreach (['id', 'created_by', 'organization_id', 'category_id'] as $field) {
            $this->patchJson("/api/projects/{$project->id}", [$field => null])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        foreach ([
            ['title' => ''], ['description' => ''], ['status' => 'draft'],
            ['modality' => str_repeat('a', 256)], ['starts_at' => 'invalid'],
            ['ends_at' => '2026-01-01'], ['starts_at' => '2028-01-01'],
        ] as $invalid) {
            $this->patchJson("/api/projects/{$project->id}", $invalid)
                ->assertUnprocessable()->assertJsonValidationErrors(array_key_first($invalid) === 'starts_at' && $invalid['starts_at'] === '2028-01-01'
                    ? 'ends_at'
                    : array_key_first($invalid));
        }

        $this->patchJson("/api/projects/{$project->id}", [])->assertUnprocessable()->assertJsonValidationErrors('project');
        $this->patchJson("/api/projects/{$project->id}", ['status' => 'in_progress'])->assertOk();
        $this->patchJson("/api/projects/{$project->id}", ['status' => 'open'])->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'status' => 'in_progress', 'title' => 'Proyecto original']);
        $this->patchJson('/api/projects/999999', ['title' => 'No existe'])->assertNotFound();
        $this->patchJson('/api/projects/abc', ['title' => 'No existe'])->assertNotFound();
    }

    public function test_author_edits_and_retires_community_need_without_deleting_it(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $need = $this->communityNeed($owner, $this->category());

        $this->patchJson("/api/community-needs/{$need->id}", ['title' => 'Ajenos'])->assertUnauthorized();
        $this->actingAs($other, 'sanctum')->patchJson("/api/community-needs/{$need->id}", [
            'title' => '', 'status' => 'withdrawn',
        ])->assertForbidden();
        $this->actingAs($owner, 'sanctum')->patchJson("/api/community-needs/{$need->id}", [
            'title' => 'Necesidad editada', 'description' => 'Nueva descripción',
            'location' => 'Oaxaca', 'status' => 'withdrawn',
        ])->assertOk()->assertJsonPath('community_need.status', 'withdrawn');
        $this->assertDatabaseHas('community_needs', [
            'id' => $need->id, 'title' => 'Necesidad editada', 'status' => 'withdrawn', 'created_by' => $owner->id,
        ]);
        $this->getJson("/api/community-needs/{$need->id}")->assertNotFound();
        $this->getJson('/api/community-needs')->assertJsonCount(0, 'community_needs');
        $this->patchJson("/api/community-needs/{$need->id}", ['status' => 'open'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }

    public function test_community_need_rejects_immutable_fields_and_invalid_payload(): void
    {
        $owner = User::factory()->create();
        $need = $this->communityNeed($owner, $this->category());
        $this->actingAs($owner, 'sanctum');

        foreach (['id', 'created_by', 'category_id', 'project_id', 'organization_id'] as $field) {
            $this->patchJson("/api/community-needs/{$need->id}", [$field => null])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        foreach ([
            ['title' => ''], ['description' => []], ['status' => 'unknown'], ['location' => str_repeat('x', 256)],
        ] as $invalid) {
            $this->patchJson("/api/community-needs/{$need->id}", $invalid)
                ->assertUnprocessable()->assertJsonValidationErrors(array_key_first($invalid));
        }
        $this->patchJson("/api/community-needs/{$need->id}", [])->assertUnprocessable()->assertJsonValidationErrors('community_need');
        $this->patchJson("/api/community-needs/{$need->id}", ['status' => 'closed'])
            ->assertOk()->assertJsonPath('community_need.status', 'closed');
        $this->patchJson('/api/community-needs/999999', ['title' => 'No existe'])->assertNotFound();
    }

    public function test_authors_can_publish_existing_drafts_but_cannot_turn_open_items_back_into_drafts(): void
    {
        $owner = User::factory()->create();
        $category = $this->category();
        $project = $this->project($owner, $category);
        $project->update(['status' => 'draft']);
        $communityNeed = $this->communityNeed($owner, $category);
        $communityNeed->update(['status' => 'draft']);

        $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'status' => 'open',
        ])->assertOk()->assertJsonPath('project.status', 'open');
        $this->patchJson("/api/community-needs/{$communityNeed->id}", [
            'status' => 'open',
        ])->assertOk()->assertJsonPath('community_need.status', 'open');

        $this->patchJson("/api/projects/{$project->id}", ['status' => 'draft'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->patchJson("/api/community-needs/{$communityNeed->id}", ['status' => 'draft'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
    }
}
