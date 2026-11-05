<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_update_project(): void
    {
        $response = $this->patchJson('/api/projects/1', [
            'title' => 'Cambio no permitido',
        ]);

        $response->assertStatus(401);

    }

    public function test_user_cannot_update_another_project(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $category = Category::create([
            'name' => 'Seguridad',
            'slug' => 'seguridad-prueba',
        ]);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto original',
            'description' => 'Proyecto para probar permisos',
            'status' => 'open',
        ]);

        $response = $this->actingAs($otherUser, 'sanctum')
            ->patchJson("/api/projects/{$project->id}", [
                'title' => 'Cambio no autorizado',
            ]);

        $response->assertStatus(403);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'title' => 'Proyecto original',
        ]);
    }

    public function test_owner_can_update_own_project(): void
    {
        $owner = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'tecnologia-prueba',
        ]);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto original',
            'description' => 'Proyecto de prueba',
            'status' => 'open',
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/projects/{$project->id}", [
                'title' => 'Proyecto actualizado',
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'title' => 'Proyecto actualizado',
        ]);
    }

    public function test_pending_organization_cannot_update_its_project_until_approved(): void
    {
        $owner = User::factory()->create();
        $organization = Organization::create([
            'name' => 'Organización pendiente', 'organization_type' => 'empresa', 'approval_status' => 'pending',
        ]);
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia-pendiente']);
        $project = Project::create([
            'created_by' => $owner->id, 'organization_id' => $organization->id,
            'category_id' => $category->id, 'title' => 'Proyecto original',
            'description' => 'Proyecto de prueba', 'status' => 'open',
        ]);

        $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$project->id}", [
            'title' => 'Cambio prematuro',
        ])->assertForbidden();
        $this->assertDatabaseHas('projects', ['id' => $project->id, 'title' => 'Proyecto original']);

        $organization->update(['approval_status' => 'approved']);
        $this->patchJson("/api/projects/{$project->id}", ['title' => 'Cambio aprobado'])->assertOk();
    }
}
