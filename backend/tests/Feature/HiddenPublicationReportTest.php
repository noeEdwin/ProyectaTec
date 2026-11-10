<?php
namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HiddenPublicationReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_hidden_community_need_cannot_be_reported(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();

        $category = Category::create([
            'name' => 'Comunidad',
            'slug' => 'comunidad-reporte-oculto',
        ]);

        $need = CommunityNeed::create([
            'created_by' => $author->id,
            'category_id' => $category->id,
            'title' => 'Necesidad comunitaria',
            'description' => 'Prueba de reporte',
            'status' => 'open',
        ]);

        $need->is_hidden = true;
        $need->save();

        $this->actingAs($reporter, 'sanctum');

        $this->postJson('/api/publication-reports', [
            'community_need_id' => $need->id,
            'reason' => 'spam',
        ])->assertNotFound();

        $this->assertDatabaseCount('publication_reports', 0);

        $need->is_hidden = false;
        $need->save();

        $this->postJson('/api/publication-reports', [
            'community_need_id' => $need->id,
            'reason' => 'spam',
        ])->assertCreated();
    }

    public function test_hidden_project_cannot_be_reported(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'proyecto-reporte-oculto',
        ]);

        $project = Project::create([
            'created_by' => $author->id,
            'category_id' => $category->id,
            'title' => 'Proyecto oculto',
            'description' => 'Prueba de reporte',
            'status' => 'open',
        ]);

        $project->is_hidden = true;
        $project->save();

        $this->actingAs($reporter, 'sanctum');

        $this->postJson('/api/publication-reports', [
            'project_id' => $project->id,
            'reason' => 'spam',
        ])->assertNotFound();

        $this->assertDatabaseCount('publication_reports', 0);

        $project->is_hidden = false;
        $project->save();

        $this->postJson('/api/publication-reports', [
            'project_id' => $project->id,
            'reason' => 'spam',
        ])->assertCreated();
    }
}
