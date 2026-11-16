<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectUpdate;
use App\Models\User;
use App\Policies\ProjectUpdatePolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class ProjectUpdateApiTest extends TestCase
{
    use RefreshDatabase;

    private function project(User $owner, array $attributes = []): Project
    {
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia-'.uniqid()]);

        return Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba',
            'description' => 'Descripción del proyecto',
            'status' => 'open',
            ...$attributes,
        ]);
    }

    private function organization(string $approval = 'approved'): Organization
    {
        return Organization::create([
            'name' => 'Organización de prueba',
            'organization_type' => 'empresa',
            'approval_status' => $approval,
        ]);
    }

    private function member(Project $project, User $user, string $status = 'active', ?Application $application = null): ProjectMember
    {
        return ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'application_id' => $application?->id,
            'role' => 'Desarrollador Laravel',
            'status' => $status,
            'joined_at' => now(),
        ]);
    }

    private function updateRecord(Project $project, User $author, array $attributes = []): ProjectUpdate
    {
        return $project->updates()->create([
            'created_by' => $author->id,
            'title' => 'Avance inicial',
            'description' => 'Descripción inicial',
            'progress' => 35,
            ...$attributes,
        ]);
    }

    private function payload(): array
    {
        return ['title' => 'Nuevo avance', 'description' => 'Trabajo realizado', 'progress' => 40];
    }

    public function test_creator_can_create_an_update_and_policy_is_discovered(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $this->assertInstanceOf(ProjectUpdatePolicy::class, Gate::getPolicyFor(ProjectUpdate::class));

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates", $this->payload())
            ->assertCreated()
            ->assertJsonPath('project_update.project_id', $project->id)
            ->assertJsonPath('project_update.author.id', $owner->id)
            ->assertJsonPath('project_update.progress', 40);

        $this->assertDatabaseHas('project_updates', [
            'id' => $response->json('project_update.id'),
            'project_id' => $project->id,
            'created_by' => $owner->id,
            'title' => 'Nuevo avance',
            'progress' => 40,
        ]);
    }

    public function test_active_admin_of_approved_organization_can_create(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $organization = $this->organization();
        $project = $this->project($owner, ['organization_id' => $organization->id]);
        OrganizationMember::create([
            'organization_id' => $organization->id, 'user_id' => $admin->id,
            'role' => 'admin', 'status' => 'active', 'joined_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates", $this->payload())
            ->assertCreated();

        $this->assertDatabaseHas('project_updates', ['id' => $response->json('project_update.id'), 'created_by' => $admin->id]);
    }

    public function test_active_members_with_or_without_accepted_application_can_create(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $withApplication = User::factory()->create();
        $withoutApplication = User::factory()->create();
        $application = Application::create([
            'project_id' => $project->id, 'user_id' => $withApplication->id, 'status' => 'accepted',
        ]);
        $this->member($project, $withApplication, 'active', $application);
        $this->member($project, $withoutApplication);

        foreach ([$withApplication, $withoutApplication] as $user) {
            $response = $this->actingAs($user, 'sanctum')
                ->postJson("/api/projects/{$project->id}/updates", $this->payload())
                ->assertCreated();
            $this->assertDatabaseHas('project_updates', ['id' => $response->json('project_update.id'), 'created_by' => $user->id]);
        }
        $this->assertDatabaseHas('project_members', ['project_id' => $project->id, 'user_id' => $withoutApplication->id, 'application_id' => null, 'status' => 'active']);
    }

    public function test_pending_or_rejected_applications_alone_do_not_grant_access(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        foreach (['pending', 'rejected'] as $status) {
            $applicant = User::factory()->create();
            Application::create(['project_id' => $project->id, 'user_id' => $applicant->id, 'status' => $status]);
            $this->actingAs($applicant, 'sanctum')
                ->postJson("/api/projects/{$project->id}/updates", $this->payload())
                ->assertForbidden();
        }
        $this->assertDatabaseCount('project_updates', 0);
    }

    public function test_guests_are_unauthorized_for_both_writes(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $update = $this->updateRecord($project, $owner);
        $this->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertUnauthorized();
        $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Cambio'])->assertUnauthorized();
    }

    public function test_nonmember_and_inactive_user_cannot_write(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $update = $this->updateRecord($project, $owner);
        $stranger = User::factory()->create();
        $inactive = User::factory()->create(['is_active' => false]);
        $this->member($project, $inactive);

        foreach ([$stranger, $inactive] as $user) {
            $this->actingAs($user, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertForbidden();
            $this->actingAs($user, 'sanctum')->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Cambio'])->assertForbidden();
        }
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'title' => 'Avance inicial']);
    }

    public function test_inactive_admin_non_admin_and_inactive_project_member_are_forbidden(): void
    {
        $owner = User::factory()->create();
        $organization = $this->organization();
        $project = $this->project($owner, ['organization_id' => $organization->id]);
        foreach ([['admin', 'inactive'], ['member', 'active']] as [$role, $status]) {
            $user = User::factory()->create();
            OrganizationMember::create(['organization_id' => $organization->id, 'user_id' => $user->id, 'role' => $role, 'status' => $status]);
            $this->actingAs($user, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertForbidden();
        }
        $participant = User::factory()->create();
        $this->member($project, $participant, 'inactive');
        $this->actingAs($participant, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertForbidden();
        $this->assertDatabaseCount('project_updates', 0);
    }

    public function test_required_and_invalid_text_fields_are_rejected(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/updates", [])
            ->assertUnprocessable()->assertJsonValidationErrors(['title', 'description']);
        foreach (['title', 'description'] as $field) {
            foreach (['', '   ', null, ['invalid']] as $value) {
                $this->postJson("/api/projects/{$project->id}/updates", [...$this->payload(), $field => $value])
                    ->assertUnprocessable()->assertJsonValidationErrors($field);
            }
        }
        $this->postJson("/api/projects/{$project->id}/updates", [...$this->payload(), 'title' => str_repeat('a', 256)])
            ->assertUnprocessable()->assertJsonValidationErrors('title');
        $this->assertDatabaseCount('project_updates', 0);
    }

    public function test_progress_boundaries_null_and_omission_are_valid(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $this->actingAs($owner, 'sanctum');
        foreach ([0, 100, null] as $progress) {
            $response = $this->postJson("/api/projects/{$project->id}/updates", [...$this->payload(), 'progress' => $progress])
                ->assertCreated()->assertJsonPath('project_update.progress', $progress);
            $this->assertDatabaseHas('project_updates', ['id' => $response->json('project_update.id'), 'progress' => $progress]);
        }
        $response = $this->postJson("/api/projects/{$project->id}/updates", ['title' => 'Sin porcentaje', 'description' => 'Actualización'])
            ->assertCreated()->assertJsonPath('project_update.progress', null);
        $this->assertDatabaseHas('project_updates', ['id' => $response->json('project_update.id'), 'progress' => null]);
    }

    public function test_invalid_progress_is_rejected_on_create_and_patch(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $update = $this->updateRecord($project, $owner);
        $this->actingAs($owner, 'sanctum');
        foreach ([-1, 101, 1.5, 'invalid', ['invalid']] as $value) {
            $this->postJson("/api/projects/{$project->id}/updates", [...$this->payload(), 'progress' => $value])
                ->assertUnprocessable()->assertJsonValidationErrors('progress');
            $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['progress' => $value])
                ->assertUnprocessable()->assertJsonValidationErrors('progress');
        }
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'progress' => 35]);
        $this->assertDatabaseCount('project_updates', 1);
    }

    public function test_protected_fields_cannot_be_supplied_on_either_write_even_as_null(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $other = User::factory()->create();
        $otherProject = $this->project($other);
        $update = $this->updateRecord($project, $owner);
        $this->actingAs($owner, 'sanctum');
        foreach (['id' => $update->id, 'project_id' => $otherProject->id, 'created_by' => $other->id] as $field => $value) {
            foreach ([$value, null] as $candidate) {
                $this->postJson("/api/projects/{$project->id}/updates", [...$this->payload(), $field => $candidate])
                    ->assertUnprocessable()->assertJsonValidationErrors($field);
                $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Cambio', $field => $candidate])
                    ->assertUnprocessable()->assertJsonValidationErrors($field);
            }
        }
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'project_id' => $project->id, 'created_by' => $owner->id, 'title' => 'Avance inicial']);
        $this->assertDatabaseCount('project_updates', 1);
    }

    public function test_patch_requires_editable_fields_and_validates_supplied_text(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $update = $this->updateRecord($project, $owner);
        $this->actingAs($owner, 'sanctum');
        $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", [])->assertUnprocessable()->assertJsonValidationErrors('project_update');
        foreach (['title', 'description'] as $field) {
            foreach (['', '   ', null, ['invalid']] as $value) {
                $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", [$field => $value])
                    ->assertUnprocessable()->assertJsonValidationErrors($field);
            }
        }
        $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => str_repeat('a', 256)])
            ->assertUnprocessable()->assertJsonValidationErrors('title');
    }

    public function test_authorized_non_author_can_patch_partially_and_clear_progress(): void
    {
        $owner = User::factory()->create();
        $participant = User::factory()->create();
        $project = $this->project($owner);
        $this->member($project, $participant);
        $update = $this->updateRecord($project, $owner);

        $this->actingAs($participant, 'sanctum')
            ->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Título corregido'])
            ->assertOk()->assertJsonPath('project_update.description', 'Descripción inicial')
            ->assertJsonPath('project_update.progress', 35)->assertJsonPath('project_update.author.id', $owner->id);
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'title' => 'Título corregido', 'description' => 'Descripción inicial', 'progress' => 35, 'created_by' => $owner->id]);

        $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['progress' => null])
            ->assertOk()->assertJsonPath('project_update.progress', null)->assertJsonPath('project_update.author.id', $owner->id);
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'progress' => null, 'created_by' => $owner->id, 'title' => 'Título corregido']);
    }

    public function test_public_list_is_paginated_stable_and_latest_progress_is_global(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $old = $this->updateRecord($project, $owner, ['progress' => 65]);
        $old->forceFill(['created_at' => '2026-01-01 10:00:00', 'updated_at' => '2026-01-01 10:00:00'])->save();
        $ids = [];
        for ($i = 0; $i < 16; $i++) {
            $update = $this->updateRecord($project, $owner, ['progress' => null]);
            $update->forceFill(['created_at' => '2026-01-02 10:00:00', 'updated_at' => '2026-01-02 10:00:00'])->save();
            $ids[] = $update->id;
        }
        $response = $this->getJson("/api/projects/{$project->id}/updates")
            ->assertOk()->assertJsonCount(15, 'project_updates')
            ->assertJsonPath('meta.current_page', 1)->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.total', 17)
            ->assertJsonPath('latest_progress.update_id', $old->id)->assertJsonPath('latest_progress.progress', 65);
        $this->assertSame(array_slice(array_reverse($ids), 0, 15), array_column($response->json('project_updates'), 'id'));
        $this->assertSame(['id', 'name'], array_keys($response->json('project_updates.0.author')));
        $this->getJson("/api/projects/{$project->id}/updates?page=2")
            ->assertOk()->assertJsonCount(2, 'project_updates')
            ->assertJsonPath('project_updates.0.id', $ids[0])->assertJsonPath('project_updates.1.id', $old->id)
            ->assertJsonPath('latest_progress.update_id', $old->id);
    }

    public function test_latest_progress_is_null_when_none_has_a_percentage(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $this->getJson("/api/projects/{$project->id}/updates")->assertOk()->assertJsonPath('latest_progress', null);
        $this->updateRecord($project, $owner, ['progress' => null]);
        $this->getJson("/api/projects/{$project->id}/updates")->assertOk()->assertJsonPath('latest_progress', null);
    }

    public function test_public_detail_has_only_expected_author_fields_and_real_data(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $update = $this->updateRecord($project, $owner);
        $response = $this->getJson("/api/projects/{$project->id}/updates/{$update->id}")
            ->assertOk()->assertJsonPath('project_update.id', $update->id)
            ->assertJsonPath('project_update.project_id', $project->id)
            ->assertJsonPath('project_update.title', 'Avance inicial')
            ->assertJsonPath('project_update.author.id', $owner->id)
            ->assertJsonMissingPath('project_update.author.email')
            ->assertJsonStructure(['project_update' => ['id', 'project_id', 'title', 'description', 'progress', 'author' => ['id', 'name'], 'created_at', 'updated_at']]);
        $this->assertSame(['id', 'name'], array_keys($response->json('project_update.author')));
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'project_id' => $project->id, 'created_by' => $owner->id]);
    }

    public function test_missing_or_cross_project_resources_return_not_found(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $otherProject = $this->project($owner);
        $foreign = $this->updateRecord($otherProject, $owner);
        $this->getJson('/api/projects/999999/updates')->assertNotFound();
        $this->getJson("/api/projects/{$project->id}/updates/999999")->assertNotFound();
        $this->getJson("/api/projects/{$project->id}/updates/{$foreign->id}")->assertNotFound();
        $this->actingAs($owner, 'sanctum')->postJson('/api/projects/999999/updates', $this->payload())->assertNotFound();
        $this->patchJson("/api/projects/{$project->id}/updates/999999", ['title' => 'Cambio'])->assertNotFound();
        $this->patchJson("/api/projects/{$project->id}/updates/{$foreign->id}", ['title' => 'Cambio'])->assertNotFound();
        $this->assertDatabaseHas('project_updates', ['id' => $foreign->id, 'project_id' => $otherProject->id, 'title' => 'Avance inicial']);
    }

    public function test_hidden_and_non_public_project_statuses_return_not_found(): void
    {
        $owner = User::factory()->create();
        $hidden = $this->project($owner);
        $hidden->is_hidden = true;
        $hidden->save();
        $projects = [$hidden];
        foreach (['draft', 'closed', 'withdrawn'] as $status) {
            $projects[] = $this->project($owner, ['status' => $status]);
        }
        foreach ($projects as $project) {
            $update = $this->updateRecord($project, $owner);
            $this->getJson("/api/projects/{$project->id}/updates")->assertNotFound();
            $this->getJson("/api/projects/{$project->id}/updates/{$update->id}")->assertNotFound();
            $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertNotFound();
            $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Cambio'])->assertNotFound();
        }
    }

    public function test_projects_of_pending_or_rejected_organizations_are_not_public_or_writable(): void
    {
        $owner = User::factory()->create();
        foreach (['pending', 'rejected'] as $approval) {
            $organization = $this->organization($approval);
            $project = $this->project($owner, ['organization_id' => $organization->id]);
            $update = $this->updateRecord($project, $owner);
            $this->getJson("/api/projects/{$project->id}/updates")->assertNotFound();
            $this->getJson("/api/projects/{$project->id}/updates/{$update->id}")->assertNotFound();
            $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertNotFound();
            $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Cambio'])->assertNotFound();
        }
    }

    public function test_completed_project_is_readable_but_rejects_authorized_writes(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner, ['status' => 'completed']);
        $update = $this->updateRecord($project, $owner);
        $this->getJson("/api/projects/{$project->id}/updates")->assertOk()->assertJsonCount(1, 'project_updates');
        $this->getJson("/api/projects/{$project->id}/updates/{$update->id}")->assertOk();
        $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())
            ->assertUnprocessable()->assertJsonValidationErrors('project');
        $this->patchJson("/api/projects/{$project->id}/updates/{$update->id}", ['title' => 'Cambio'])
            ->assertUnprocessable()->assertJsonValidationErrors('project');
        $this->assertDatabaseHas('project_updates', ['id' => $update->id, 'title' => 'Avance inicial']);
        $this->assertDatabaseCount('project_updates', 1);
    }

    public function test_in_progress_project_accepts_authorized_writes(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner, ['status' => 'in_progress']);
        $response = $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/updates", $this->payload())->assertCreated();
        $id = $response->json('project_update.id');
        $this->patchJson("/api/projects/{$project->id}/updates/{$id}", ['progress' => 100])->assertOk()->assertJsonPath('project_update.progress', 100);
        $this->assertDatabaseHas('project_updates', ['id' => $id, 'project_id' => $project->id, 'created_by' => $owner->id, 'progress' => 100]);
    }

    public function test_existing_public_project_endpoint_remains_available(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $this->updateRecord($project, $owner);
        $this->getJson("/api/projects/{$project->id}")->assertOk()->assertJsonPath('project.id', $project->id)
            ->assertJsonPath('project.title', 'Proyecto de prueba');
        $this->getJson('/api/projects')->assertOk()->assertJsonPath('projects.0.id', $project->id);
    }
}
