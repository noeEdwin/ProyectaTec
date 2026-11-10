<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminPublicationModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'services.proyectatec.admin_emails',
            ['admin@example.com']
        );
    }

    private function publications(): array
    {
        $owner = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'moderacion-pruebas',
        ]);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto original',
            'description' => 'Proyecto de prueba',
            'status' => 'open',
        ]);

        $need = CommunityNeed::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Necesidad original',
            'description' => 'Necesidad de prueba',
            'status' => 'open',
        ]);

        return [$project, $need];
    }

    public function test_guest_cannot_moderate_publications(): void
    {
        [$project, $need] = $this->publications();

        $this->patchJson(
            "/api/admin/projects/{$project->id}/visibility",
            ['is_hidden' => true]
        )->assertUnauthorized();

        $this->patchJson(
            "/api/admin/community-needs/{$need->id}/visibility",
            ['is_hidden' => true]
        )->assertUnauthorized();
    }

    public function test_regular_user_cannot_moderate_publications(): void
    {
        [$project, $need] = $this->publications();

        $regular = User::factory()->create();

        $this->actingAs($regular, 'sanctum');

        $this->patchJson(
            "/api/admin/projects/{$project->id}/visibility",
            ['is_hidden' => true]
        )->assertForbidden();

        $this->patchJson(
            "/api/admin/community-needs/{$need->id}/visibility",
            ['is_hidden' => true]
        )->assertForbidden();

        $this->assertFalse($project->fresh()->is_hidden);
        $this->assertFalse($need->fresh()->is_hidden);
    }

    public function test_admin_can_hide_and_restore_project(): void
    {
        [$project] = $this->publications();

        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin, 'sanctum');

        $this->patchJson(
            "/api/admin/projects/{$project->id}/visibility",
            ['is_hidden' => true]
        )
            ->assertOk()
            ->assertJsonPath('project.is_hidden', true);

        $this->getJson("/api/projects/{$project->id}")
            ->assertNotFound();

        $this->patchJson(
            "/api/admin/projects/{$project->id}/visibility",
            ['is_hidden' => false]
        )
            ->assertOk()
            ->assertJsonPath('project.is_hidden', false);

        $this->getJson("/api/projects/{$project->id}")
            ->assertOk();

        $this->assertSame('open', $project->fresh()->status);
    }

    public function test_admin_can_hide_and_restore_community_need(): void
    {
        [, $need] = $this->publications();

        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin, 'sanctum');

        $this->patchJson(
            "/api/admin/community-needs/{$need->id}/visibility",
            ['is_hidden' => true]
        )
            ->assertOk()
            ->assertJsonPath('community_need.is_hidden', true);

        $this->getJson("/api/community-needs/{$need->id}")
            ->assertNotFound();

        $this->patchJson(
            "/api/admin/community-needs/{$need->id}/visibility",
            ['is_hidden' => false]
        )
            ->assertOk()
            ->assertJsonPath('community_need.is_hidden', false);

        $this->getJson("/api/community-needs/{$need->id}")
            ->assertOk();

        $this->assertSame('open', $need->fresh()->status);
    }

    public function test_admin_must_send_a_valid_boolean(): void
    {
        [$project] = $this->publications();

        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin, 'sanctum');

        $this->patchJson(
            "/api/admin/projects/{$project->id}/visibility",
            []
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_hidden');

        $this->patchJson(
            "/api/admin/projects/{$project->id}/visibility",
            ['is_hidden' => 'valor-invalido']
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('is_hidden');

        $this->assertFalse($project->fresh()->is_hidden);
    }
}

