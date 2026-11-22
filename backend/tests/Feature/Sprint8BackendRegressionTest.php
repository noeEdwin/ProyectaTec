<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectNeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Sprint8BackendRegressionTest extends TestCase
{
    use RefreshDatabase;

    private function project(User $owner, Category $category, string $title): Project
    {
        return Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => $title,
            'description' => 'Descripción del proyecto de regresión.',
            'status' => 'open',
        ]);
    }

    private function need(Project $project, string $title): ProjectNeed
    {
        return $project->needs()->create([
            'title' => $title,
            'description' => 'Descripción original del requerimiento.',
            'required_profile' => 'Perfil original',
            'openings' => 2,
            'status' => 'open',
        ]);
    }

    private function requirementPayload(?int $id, string $title): array
    {
        $payload = [
            'title' => $title,
            'description' => 'Descripción actualizada.',
            'required_profile' => 'Perfil actualizado',
            'openings' => 3,
        ];

        if ($id !== null) {
            $payload['id'] = $id;
        }

        return $payload;
    }

    public function test_public_organization_can_be_found_by_its_public_location(): void
    {
        $organization = Organization::create([
            'name' => 'Organización Horizonte',
            'organization_type' => 'empresa',
            'description' => 'Servicios comunitarios',
            'sector' => 'Educación',
            'location' => 'Paraje Publicolumen',
            'public_fields' => ['location'],
            'approval_status' => 'approved',
        ]);

        $this->getJson('/api/organizations?q=Publicolumen')
            ->assertOk()
            ->assertJsonCount(1, 'organizations')
            ->assertJsonPath('organizations.0.id', $organization->id)
            ->assertJsonPath('organizations.0.location', 'Paraje Publicolumen');
    }

    public function test_private_organization_location_cannot_be_used_to_find_it_but_its_name_can(): void
    {
        $organization = Organization::create([
            'name' => 'Organización Identidadunica',
            'organization_type' => 'empresa',
            'description' => 'Servicios comunitarios',
            'sector' => 'Educación',
            'location' => 'Paraje Secretolucero',
            'public_fields' => [],
            'approval_status' => 'approved',
        ]);

        $this->getJson('/api/organizations?q=Identidadunica')
            ->assertOk()
            ->assertJsonCount(1, 'organizations')
            ->assertJsonPath('organizations.0.id', $organization->id)
            ->assertJsonPath('organizations.0.location', null);

        $this->getJson('/api/organizations?q=Secretolucero')
            ->assertOk()
            ->assertJsonCount(0, 'organizations');
    }

    public function test_owner_can_update_existing_requirements_and_create_a_new_one(): void
    {
        $owner = User::factory()->create();
        $category = Category::create(['name' => 'Regresión', 'slug' => 'regresion-sprint8']);
        $project = $this->project($owner, $category, 'Proyecto original');
        $existing = $this->need($project, 'Requerimiento original');
        $removed = $this->need($project, 'Requerimiento prescindible');

        $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'title' => 'Proyecto actualizado',
            'needs' => [
                $this->requirementPayload($existing->id, 'Requerimiento actualizado'),
                $this->requirementPayload(null, 'Requerimiento nuevo'),
            ],
        ])->assertOk()
            ->assertJsonPath('project.title', 'Proyecto actualizado')
            ->assertJsonCount(2, 'project.needs');

        $this->assertDatabaseHas('project_needs', [
            'id' => $existing->id,
            'project_id' => $project->id,
            'title' => 'Requerimiento actualizado',
            'description' => 'Descripción actualizada.',
            'required_profile' => 'Perfil actualizado',
            'openings' => 3,
        ]);
        $this->assertDatabaseHas('project_needs', [
            'project_id' => $project->id,
            'title' => 'Requerimiento nuevo',
        ]);
        $this->assertDatabaseMissing('project_needs', ['id' => $removed->id]);
        $this->assertDatabaseCount('project_needs', 2);
    }

    public function test_foreign_requirement_id_is_rejected_without_changing_either_project(): void
    {
        $owner = User::factory()->create();
        $otherOwner = User::factory()->create();
        $category = Category::create(['name' => 'Regresión', 'slug' => 'regresion-sprint8']);
        $project = $this->project($owner, $category, 'Proyecto original');
        $otherProject = $this->project($otherOwner, $category, 'Proyecto ajeno');
        $existing = $this->need($project, 'Requerimiento original');
        $foreign = $this->need($otherProject, 'Requerimiento ajeno');
        $before = ProjectNeed::query()->orderBy('id')->get()->toArray();

        $response = $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'title' => 'Cambio que debe rechazarse',
            'needs' => [
                $this->requirementPayload($existing->id, 'Cambio válido parcial'),
                $this->requirementPayload($foreign->id, 'Cambio ajeno'),
            ],
        ]);

        $response->assertUnprocessable();
        $this->assertSame($before, ProjectNeed::query()->orderBy('id')->get()->toArray());
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'Proyecto original']);
    }

    public function test_nonexistent_requirement_id_is_rejected_without_changing_existing_requirements(): void
    {
        $owner = User::factory()->create();
        $category = Category::create(['name' => 'Regresión', 'slug' => 'regresion-sprint8']);
        $project = $this->project($owner, $category, 'Proyecto original');
        $existing = $this->need($project, 'Requerimiento original');
        $omitted = $this->need($project, 'Requerimiento que debe conservarse');
        $missingId = $omitted->id + 1000;
        $before = ProjectNeed::query()->orderBy('id')->get()->toArray();

        $response = $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'title' => 'Cambio que debe rechazarse',
            'needs' => [
                $this->requirementPayload($existing->id, 'Cambio válido parcial'),
                $this->requirementPayload($missingId, 'Requerimiento inexistente'),
            ],
        ]);

        $response->assertUnprocessable();
        $this->assertSame($before, ProjectNeed::query()->orderBy('id')->get()->toArray());
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'Proyecto original']);
    }

    public function test_duplicate_requirement_ids_are_rejected_without_changing_existing_requirements(): void
    {
        $owner = User::factory()->create();
        $category = Category::create(['name' => 'Regresión', 'slug' => 'regresion-sprint8']);
        $project = $this->project($owner, $category, 'Proyecto original');
        $existing = $this->need($project, 'Requerimiento original');
        $this->need($project, 'Requerimiento que debe conservarse');
        $before = ProjectNeed::query()->orderBy('id')->get()->toArray();

        $response = $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'title' => 'Cambio que debe rechazarse',
            'needs' => [
                $this->requirementPayload($existing->id, 'Primer cambio'),
                $this->requirementPayload($existing->id, 'Segundo cambio'),
            ],
        ]);

        $response->assertUnprocessable();
        $this->assertSame($before, ProjectNeed::query()->orderBy('id')->get()->toArray());
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'Proyecto original']);
    }
}
