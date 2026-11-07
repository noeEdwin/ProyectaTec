<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectNeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectNeedApiTest extends TestCase
{
    use RefreshDatabase;

    private function project(User $owner, string $status = 'open', ?Organization $organization = null): Project
    {
        $category = Category::firstOrCreate(['slug' => 'tecnologia'], ['name' => 'Tecnología']);

        return Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'organization_id' => $organization?->id,
            'title' => 'Proyecto',
            'description' => 'Descripción del proyecto',
            'status' => $status,
        ]);
    }

    private function payload(): array
    {
        return ['title' => 'Necesidad', 'description' => 'Descripción de la necesidad', 'status' => 'open'];
    }

    private function need(Project $project, string $status = 'open'): ProjectNeed
    {
        return $project->needs()->create([...$this->payload(), 'status' => $status]);
    }

    public function test_creator_can_create_a_need_for_the_url_project(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);

        foreach ([null, 1, 2147483647] as $openings) {
            $response = $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/needs", [
                ...$this->payload(), 'required_profile' => 'Frontend', 'openings' => $openings,
            ]);
            $response->assertCreated()->assertJsonPath('project_need.project_id', $project->id)
                ->assertJsonPath('project_need.openings', $openings)
                ->assertJsonPath('project_need.status', 'open')
                ->assertJsonMissingPath('project_need.creator')
                ->assertJsonMissingPath('project_need.applications');
            $this->assertDatabaseHas('project_needs', [
                'id' => $response->json('project_need.id'), 'project_id' => $project->id, 'openings' => $openings,
            ]);
        }

        $this->assertDatabaseCount('project_needs', 3);
        $this->assertDatabaseCount('community_needs', 0);
    }

    public function test_guest_cannot_create_a_need(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);

        $this->postJson("/api/projects/{$project->id}/needs", $this->payload())->assertUnauthorized();
        $this->assertDatabaseCount('project_needs', 0);
    }

    public function test_only_project_creator_can_create_even_for_an_organization(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $admin = User::factory()->create();
        $organization = Organization::create(['name' => 'Organización', 'organization_type' => 'empresa']);
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        $project = $this->project($owner, 'open', $organization);

        foreach ([$other, $admin] as $user) {
            $this->actingAs($user, 'sanctum')->postJson("/api/projects/{$project->id}/needs", $this->payload())
                ->assertForbidden();
        }
        $this->assertDatabaseCount('project_needs', 0);
    }

    public function test_nonexistent_and_nonpublic_projects_are_not_accessible(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        foreach (['draft', 'unknown'] as $status) {
            $project = $this->project($owner, $status);
            $need = $this->need($project);
            $this->getJson("/api/projects/{$project->id}/needs")->assertNotFound();
            $this->getJson("/api/projects/{$project->id}/needs/{$need->id}")->assertNotFound();
            foreach ([$owner, $other] as $user) {
                $this->actingAs($user, 'sanctum')->postJson("/api/projects/{$project->id}/needs", [])
                    ->assertNotFound();
            }
        }
        $this->getJson('/api/projects/999999/needs')->assertNotFound();
        $this->getJson('/api/projects/999999/needs/1')->assertNotFound();
        $this->actingAs($owner, 'sanctum')->postJson('/api/projects/999999/needs', [])->assertNotFound();
    }

    public function test_required_invalid_and_out_of_range_fields_are_rejected(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $url = "/api/projects/{$project->id}/needs";

        $this->actingAs($owner, 'sanctum')->postJson($url, [])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'status']);
        foreach ([
            ['title', str_repeat('a', 256)],
            ['title', ['invalid']],
            ['description', ''],
            ['description', ['invalid']],
            ['required_profile', str_repeat('a', 256)],
            ['required_profile', ['invalid']],
            ['openings', 0],
            ['openings', -1],
            ['openings', 2147483648],
            ['openings', 1.5],
            ['status', 'closed'],
            ['status', 'draft'],
            ['status', 'unknown'],
        ] as [$field, $value]) {
            $this->actingAs($owner, 'sanctum')->postJson($url, [...$this->payload(), $field => $value])
                ->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->assertDatabaseCount('project_needs', 0);
    }

    public function test_client_cannot_send_controlled_identifiers_even_when_null(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        foreach (['project_id', 'created_by', 'category_id', 'organization_id'] as $field) {
            foreach ([$project->id, null] as $value) {
                $this->actingAs($owner, 'sanctum')->postJson("/api/projects/{$project->id}/needs", [
                    ...$this->payload(), $field => $value,
                ])->assertUnprocessable()->assertJsonValidationErrors($field);
            }
        }
        $this->assertDatabaseCount('project_needs', 0);
        $this->assertDatabaseCount('community_needs', 0);
    }

    public function test_public_reads_are_scoped_to_open_needs_and_their_project(): void
    {
        $owner = User::factory()->create();
        foreach (['open', 'in_progress', 'completed'] as $status) {
            $project = $this->project($owner, $status);
            $open = $this->need($project);
            $closed = $this->need($project, 'closed');
            $unknown = $this->need($project, 'unknown');
            $draft = $this->need($project, 'draft');

            $this->getJson("/api/projects/{$project->id}/needs")->assertOk()
                ->assertJsonCount(1, 'project_needs')->assertJsonPath('project_needs.0.id', $open->id)
                ->assertJsonPath('meta.total', 1);
            $this->getJson("/api/projects/{$project->id}/needs/{$open->id}")->assertOk()
                ->assertJsonPath('project_need.project_id', $project->id)
                ->assertJsonPath('project_need.status', 'open')
                ->assertJsonMissingPath('project_need.applications');
            foreach ([$closed, $unknown, $draft] as $hidden) {
                $this->getJson("/api/projects/{$project->id}/needs/{$hidden->id}")->assertNotFound();
            }
            $this->getJson("/api/projects/{$project->id}/needs/999999")->assertNotFound();
        }

        $first = $this->project($owner);
        $second = $this->project($owner);
        $otherNeed = $this->need($second);
        $this->getJson("/api/projects/{$first->id}/needs/{$otherNeed->id}")->assertNotFound();
        $this->getJson("/api/projects/{$first->id}/needs")->assertOk()
            ->assertJsonCount(0, 'project_needs')->assertJsonPath('meta.total', 0);
    }

    public function test_public_list_paginates_and_orders_within_the_project(): void
    {
        $owner = User::factory()->create();
        $project = $this->project($owner);
        $other = $this->project($owner);
        $this->need($other);
        $ids = [];
        for ($i = 0; $i < 16; $i++) {
            $need = $this->need($project);
            $need->created_at = '2027-01-01 12:00:00';
            $need->save();
            $ids[] = $need->id;
        }
        $older = $this->need($project);
        $older->created_at = '2026-01-01 12:00:00';
        $older->save();

        $first = $this->getJson("/api/projects/{$project->id}/needs")->assertOk()
            ->assertJsonCount(15, 'project_needs')->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 15)->assertJsonPath('meta.last_page', 2)->assertJsonPath('meta.total', 17);
        $second = $this->getJson("/api/projects/{$project->id}/needs?page=2")->assertOk()
            ->assertJsonCount(2, 'project_needs')->assertJsonPath('meta.current_page', 2);
        $expected = [...array_reverse($ids), $older->id];
        $this->assertSame(array_slice($expected, 0, 15), array_column($first->json('project_needs'), 'id'));
        $this->assertSame(array_slice($expected, 15), array_column($second->json('project_needs'), 'id'));
    }
}
