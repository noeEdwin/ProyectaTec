<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
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
    $owner = \App\Models\User::factory()->create();
    $otherUser = \App\Models\User::factory()->create();

    $category = \App\Models\Category::create([
        'name' => 'Seguridad',
        'slug' => 'seguridad-prueba',
    ]);

    $project = \App\Models\Project::create([
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
    $owner = \App\Models\User::factory()->create();

    $category = \App\Models\Category::create([
        'name' => 'Tecnologia',
        'slug' => 'tecnologia-prueba',
    ]);

    $project = \App\Models\Project::create([
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
}
