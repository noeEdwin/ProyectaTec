<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ApplicationAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    /**
     * A basic feature test example.
     */
    public function test_guest_cannot_review_application(): void
{
    $response = $this->patchJson('/api/applications/1', [
        'status' => 'accepted',
    ]);

    $response->assertStatus(401);
}
public function test_user_cannot_review_another_project_application(): void
{
    $owner = \App\Models\User::factory()->create();
    $applicant = \App\Models\User::factory()->create();
    $otherUser = \App\Models\User::factory()->create();

    $category = \App\Models\Category::create([
        'name' => 'Tecnologia',
        'slug' => 'tecnologia-solicitudes',
    ]);

    $project = \App\Models\Project::create([
        'created_by' => $owner->id,
        'category_id' => $category->id,
        'title' => 'Proyecto original',
        'description' => 'Proyecto para probar solicitudes',
        'status' => 'open',
    ]);

    $application = \App\Models\Application::create([
        'project_id' => $project->id,
        'user_id' => $applicant->id,
        'message' => 'Quiero participar',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($otherUser, 'sanctum')
        ->patchJson("/api/applications/{$application->id}", [
            'status' => 'accepted',
        ]);

    $response->assertStatus(403);

    $this->assertDatabaseHas('applications', [
        'id' => $application->id,
        'status' => 'pending',
    ]);
}
public function test_project_owner_can_review_application(): void
{
    $owner = \App\Models\User::factory()->create();
    $applicant = \App\Models\User::factory()->create();

    $category = \App\Models\Category::create([
        'name' => 'Educacion',
        'slug' => 'educacion-solicitudes',
    ]);

    $project = \App\Models\Project::create([
        'created_by' => $owner->id,
        'category_id' => $category->id,
        'title' => 'Proyecto educativo',
        'description' => 'Proyecto de prueba',
        'status' => 'open',
    ]);

    $application = \App\Models\Application::create([
        'project_id' => $project->id,
        'user_id' => $applicant->id,
        'message' => 'Me interesa participar',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($owner, 'sanctum')
        ->patchJson("/api/applications/{$application->id}", [
            'status' => 'accepted',
        ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('applications', [
        'id' => $application->id,
        'status' => 'accepted',
        'reviewed_by' => $owner->id,
    ]);

    $this->assertNotNull($application->fresh()->reviewed_at);
}
}
