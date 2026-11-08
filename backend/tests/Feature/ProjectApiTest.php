<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectApiTest extends TestCase
{
    use RefreshDatabase;

    private function category(): Category
    {
        return Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia']);
    }

    private function payload(Category $category): array
    {
        return [
            'title' => 'Proyecto de prueba',
            'description' => 'Descripción del proyecto',
            'category_id' => $category->id,
            'status' => 'open',
        ];
    }

    private function organization(): Organization
    {
        return Organization::create(['name' => 'Organización', 'organization_type' => 'empresa']);
    }

    private function project(User $user, Category $category, string $status = 'open'): Project
    {
        return Project::create([...$this->payload($category), 'created_by' => $user->id, 'status' => $status]);
    }

    public function test_authenticated_user_can_create_a_personal_project(): void
    {
        $user = User::factory()->create();
        $category = $this->category();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/projects', [
            ...$this->payload($category),
            'modality' => 'híbrida',
            'location' => 'Oaxaca',
            'starts_at' => '2027-01-01T09:00:00Z',
            'ends_at' => '2027-01-02T09:00:00Z',
        ]);

        $response->assertCreated()->assertJsonPath('project.title', 'Proyecto de prueba')
            ->assertJsonPath('project.organization_id', null)
            ->assertJsonMissingPath('project.created_by')
            ->assertJsonMissingPath('project.creator');
        $this->assertDatabaseHas('projects', [
            'id' => $response->json('project.id'), 'created_by' => $user->id,
            'category_id' => $category->id, 'organization_id' => null,
        ]);
    }

    public function test_active_organization_admin_can_create_a_project(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $organization = $this->organization();
        $organization->memberships()->create(['user_id' => $user->id, 'role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/projects', [
            ...$this->payload($category), 'organization_id' => $organization->id,
        ]);

        $response->assertCreated()->assertJsonPath('project.organization_id', $organization->id);
        $this->assertDatabaseHas('projects', [
            'id' => $response->json('project.id'), 'created_by' => $user->id, 'organization_id' => $organization->id,
        ]);
    }

    public function test_guest_cannot_create_a_project(): void
    {
        $this->postJson('/api/projects', [])->assertUnauthorized();
        $this->assertDatabaseCount('projects', 0);
    }

    public function test_organization_requires_active_admin_membership(): void
    {
        $category = $this->category();
        $organization = $this->organization();
        $nonmember = User::factory()->create();
        $member = User::factory()->create();
        $inactiveAdmin = User::factory()->create();
        $organization->memberships()->create(['user_id' => $member->id, 'role' => 'member', 'status' => 'active']);
        $organization->memberships()->create(['user_id' => $inactiveAdmin->id, 'role' => 'admin', 'status' => 'inactive']);

        foreach ([$nonmember, $member, $inactiveAdmin] as $user) {
            $this->actingAs($user, 'sanctum')->postJson('/api/projects', [
                ...$this->payload($category), 'organization_id' => $organization->id,
            ])->assertForbidden();
        }

        $this->assertDatabaseCount('projects', 0);
    }

    public function test_required_and_invalid_fields_are_rejected(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $this->actingAs($user, 'sanctum')->postJson('/api/projects', [])
            ->assertUnprocessable()->assertJsonValidationErrors(['title', 'description', 'category_id', 'status']);

        foreach ([
            ['title' => str_repeat('a', 256)],
            ['description' => ['invalid']],
            ['modality' => str_repeat('a', 256)],
            ['location' => str_repeat('a', 256)],
            ['status' => 'draft'],
            ['status' => 'unknown'],
            ['category_id' => 999999],
            ['organization_id' => 999999],
            ['starts_at' => 'invalid'],
            ['ends_at' => 'invalid'],
            ['starts_at' => '2027-02-02', 'ends_at' => '2027-02-01'],
        ] as $invalid) {
            $this->actingAs($user, 'sanctum')->postJson('/api/projects', [
                ...$this->payload($category), ...$invalid,
            ])->assertUnprocessable()->assertJsonValidationErrors(array_key_last($invalid));
        }

        $this->assertDatabaseCount('projects', 0);
    }

    public function test_client_cannot_set_created_by_even_to_null(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $category = $this->category();

        foreach ([$other->id, null] as $creator) {
            $this->actingAs($user, 'sanctum')->postJson('/api/projects', [
                ...$this->payload($category), 'created_by' => $creator,
            ])->assertUnprocessable()->assertJsonValidationErrors('created_by');
        }

        $this->assertDatabaseCount('projects', 0);
    }

    public function test_public_reads_only_show_published_statuses(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $published = [];
        foreach (['open', 'in_progress', 'completed'] as $status) {
            $published[] = $this->project($user, $category, $status);
        }
        $draft = $this->project($user, $category, 'draft');
        $unknown = $this->project($user, $category, 'unknown');

        $response = $this->getJson('/api/projects')->assertOk()->assertJsonCount(3, 'projects')
            ->assertJsonPath('meta.total', 3);
        $ids = array_column($response->json('projects'), 'id');
        foreach ($published as $project) {
            $this->assertContains($project->id, $ids);
            $this->getJson("/api/projects/{$project->id}")->assertOk()
                ->assertJsonPath('project.status', $project->status)
                ->assertJsonMissingPath('project.creator')
                ->assertJsonMissingPath('project.created_by');
        }
        $this->assertNotContains($draft->id, $ids);
        $this->assertNotContains($unknown->id, $ids);
        $this->getJson("/api/projects/{$draft->id}")->assertNotFound();
        $this->getJson("/api/projects/{$unknown->id}")->assertNotFound();
        $this->getJson('/api/projects/999999')->assertNotFound();
    }

    public function test_projects_are_paginated_and_ordered_by_date_then_id_descending(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $ids = [];
        for ($i = 0; $i < 16; $i++) {
            $project = $this->project($user, $category);
            $project->created_at = '2027-01-01 12:00:00';
            $project->save();
            $ids[] = $project->id;
        }
        $older = $this->project($user, $category);
        $older->created_at = '2026-01-01 12:00:00';
        $older->save();

        $first = $this->getJson('/api/projects')->assertOk()->assertJsonCount(15, 'projects')
            ->assertJsonPath('meta.current_page', 1)->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.total', 17);
        $second = $this->getJson('/api/projects?page=2')->assertOk()->assertJsonCount(2, 'projects')
            ->assertJsonPath('meta.current_page', 2);
        $expected = [...array_reverse($ids), $older->id];
        $this->assertSame(array_slice($expected, 0, 15), array_column($first->json('projects'), 'id'));
        $this->assertSame(array_slice($expected, 15), array_column($second->json('projects'), 'id'));
    }

    public function test_existing_patch_still_only_allows_the_creator(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $category = $this->category();
        $project = $this->project($owner, $category);

        $this->patchJson("/api/projects/{$project->id}", ['title' => 'Invitado'])->assertUnauthorized();
        $this->actingAs($other, 'sanctum')->patchJson("/api/projects/{$project->id}", ['title' => 'Otro'])
            ->assertForbidden();
        $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", ['title' => 'Actualizado'])
            ->assertOk()->assertJsonPath('project.title', 'Actualizado');
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'Actualizado']);
    }

    public function test_pending_organization_cannot_publish_projects_or_expose_existing_projects_and_needs(): void
    {
        $representative = User::factory()->create(['account_type' => 'organizacion']);
        $category = $this->category();
        $organization = Organization::create([
            'name' => 'Pendiente', 'organization_type' => 'empresa', 'approval_status' => 'pending',
        ]);
        $organization->memberships()->create([
            'user_id' => $representative->id, 'role' => 'admin', 'status' => 'active',
        ]);
        $existing = Project::create([
            ...$this->payload($category),
            'created_by' => $representative->id,
            'organization_id' => $organization->id,
        ]);
        $need = $existing->needs()->create([
            'title' => 'Necesidad anterior', 'description' => 'Oculta durante revisión', 'status' => 'open',
        ]);

        $this->actingAs($representative, 'sanctum')->postJson('/api/projects', [
            ...$this->payload($category), 'organization_id' => $organization->id,
        ])->assertForbidden();
        $this->postJson('/api/projects', $this->payload($category))->assertForbidden();
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(0, 'projects');
        $this->getJson("/api/projects/{$existing->id}")->assertNotFound();
        $this->getJson("/api/projects/{$existing->id}/needs")->assertNotFound();
        $this->getJson("/api/projects/{$existing->id}/needs/{$need->id}")->assertNotFound();
        $this->postJson("/api/projects/{$existing->id}/needs", [
            'title' => 'Nueva necesidad', 'description' => 'No debe publicarse', 'status' => 'open',
        ])->assertNotFound();
        $this->getJson('/api/proyectos/destacado')->assertJsonPath('titulo', 'AgroTech Oaxaca');

        $organization->update(['approval_status' => 'approved']);
        $this->postJson('/api/projects', [
            ...$this->payload($category), 'organization_id' => $organization->id,
        ])->assertCreated();
        $this->getJson("/api/projects/{$existing->id}")->assertOk();
        $this->getJson("/api/projects/{$existing->id}/needs/{$need->id}")->assertOk();
    }

    public function test_personal_account_cannot_publish_on_behalf_of_pending_organization(): void
    {
        $user = User::factory()->create(['account_type' => 'estudiante']);
        $category = $this->category();
        $organization = Organization::create([
            'name' => 'Pendiente', 'organization_type' => 'sector_social', 'approval_status' => 'pending',
        ]);
        $organization->memberships()->create([
            'user_id' => $user->id, 'role' => 'admin', 'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/projects', [
            ...$this->payload($category), 'organization_id' => $organization->id,
        ])->assertForbidden();
        $this->postJson('/api/projects', $this->payload($category))->assertCreated();
    }
}
