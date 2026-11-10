<?php
namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicationVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_hidden_project_is_not_public(): void
    {
        $user = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'tecnologia-visibilidad',
        ]);

        $project = Project::create([
            'created_by' => $user->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba',
            'description' => 'Prueba de moderacion',
            'status' => 'open',
        ]);

        $this->getJson("/api/projects/{$project->id}")
            ->assertOk();

        $project->is_hidden = true;
        $project->save();

        $this->getJson('/api/projects')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->getJson("/api/projects/{$project->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('projects', [
            'id' => $project->id,
            'is_hidden' => true,
            'status' => 'open',
        ]);

        $project->is_hidden = false;
        $project->save();

        $this->getJson("/api/projects/{$project->id}")
            ->assertOk();
    }

    public function test_hidden_community_need_is_not_public(): void
    {
        $user = User::factory()->create();

        $category = Category::create([
            'name' => 'Comunidad',
            'slug' => 'comunidad-visibilidad',
        ]);

        $need = CommunityNeed::create([
            'created_by' => $user->id,
            'category_id' => $category->id,
            'title' => 'Necesidad de prueba',
            'description' => 'Prueba de moderacion',
            'status' => 'open',
        ]);

        $this->getJson("/api/community-needs/{$need->id}")
            ->assertOk();

        $need->is_hidden = true;
        $need->save();

        $this->getJson('/api/community-needs')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->getJson("/api/community-needs/{$need->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('community_needs', [
            'id' => $need->id,
            'is_hidden' => true,
            'status' => 'open',
        ]);

        $need->is_hidden = false;
        $need->save();

        $this->getJson("/api/community-needs/{$need->id}")
            ->assertOk();
    }
}
