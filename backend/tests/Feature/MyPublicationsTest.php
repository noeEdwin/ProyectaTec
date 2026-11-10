<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MyPublicationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_list_and_load_only_editable_publications(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia']);
        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto propio',
            'description' => 'Descripción de proyecto',
            'status' => 'open',
        ]);
        Project::create([
            'created_by' => $other->id,
            'category_id' => $category->id,
            'title' => 'Proyecto ajeno',
            'description' => 'Descripción privada',
            'status' => 'open',
        ]);
        $need = CommunityNeed::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Necesidad propia',
            'description' => 'Descripción de necesidad',
            'status' => 'open',
        ]);

        $this->actingAs($owner, 'sanctum')->getJson('/api/me/publications')
            ->assertOk()
            ->assertJsonCount(2, 'publications')
            ->assertJsonFragment(['id' => $project->id, 'type' => 'proyecto', 'can_edit' => true])
            ->assertJsonFragment(['id' => $need->id, 'type' => 'necesidad', 'can_edit' => true])
            ->assertJsonMissing(['title' => 'Proyecto ajeno']);

        $this->actingAs($owner, 'sanctum')->getJson("/api/me/publications/proyecto/{$project->id}")
            ->assertOk()
            ->assertJsonPath('project.title', 'Proyecto propio');

        $this->actingAs($owner, 'sanctum')->getJson("/api/me/publications/proyecto/".($project->id + 1))
            ->assertForbidden();
    }

    public function test_guest_cannot_list_or_load_editable_publications(): void
    {
        $this->getJson('/api/me/publications')->assertUnauthorized();
        $this->getJson('/api/me/publications/proyecto/1')->assertUnauthorized();
    }
}
