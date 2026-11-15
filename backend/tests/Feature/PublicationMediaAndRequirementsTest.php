<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PublicationMediaAndRequirementsTest extends TestCase
{
    use RefreshDatabase;

    private function createCategory(): Category
    {
        return Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia-media-test']);
    }

    private function fakePng(string $name = 'foto.png'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
        ));
    }

    public function test_creator_can_create_and_update_project_with_multiple_needs_and_media(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $applicant = User::factory()->create();
        $category = $this->createCategory();

        $createResponse = $this->actingAs($owner, 'sanctum')->postJson('/api/projects', [
            'title' => 'Sistema de monitoreo comunitario',
            'description' => 'Proyecto integral con sensores IoT para calidad del agua en Oaxaca.',
            'category_id' => $category->id,
            'status' => 'open',
            'modality' => 'hibrida',
            'location' => 'Oaxaca de Juárez',
            'needs' => [
                [
                    'title' => 'Desarrollador Backend',
                    'required_profile' => 'Ing. en Sistemas',
                    'description' => 'API Laravel y base de datos',
                    'openings' => 2,
                ],
                [
                    'title' => 'Diseñador UX/UI',
                    'required_profile' => 'Diseño Digital',
                    'openings' => 1,
                ],
            ],
        ]);

        $createResponse->assertCreated()
            ->assertJsonCount(2, 'project.needs')
            ->assertJsonPath('project.needs.0.title', 'Desarrollador Backend')
            ->assertJsonPath('project.needs.0.openings', 2)
            ->assertJsonPath('project.needs.1.title', 'Diseñador UX/UI')
            ->assertJsonPath('project.needs.1.description', 'Diseñador UX/UI');

        $projectId = $createResponse->json('project.id');
        $firstNeedId = $createResponse->json('project.needs.0.id');
        $secondNeedId = $createResponse->json('project.needs.1.id');

        Application::create([
            'project_id' => $projectId,
            'project_need_id' => $firstNeedId,
            'user_id' => $applicant->id,
            'status' => 'pending',
        ]);

        $cover = $this->fakePng('portada.png');
        $gallery1 = $this->fakePng('galeria1.png');
        $gallery2 = $this->fakePng('galeria2.png');

        $mediaResponse = $this->actingAs($owner, 'sanctum')->post("/api/publications/proyecto/{$projectId}/media", [
            'cover_image' => $cover,
            'gallery' => [$gallery1, $gallery2],
        ]);

        $mediaResponse->assertOk();
        $this->assertNotNull($mediaResponse->json('project.cover_image_url'));
        $this->assertCount(2, $mediaResponse->json('project.gallery'));
        $this->assertCount(2, $mediaResponse->json('project.gallery_urls'));

        $project = Project::findOrFail($projectId);
        Storage::disk('public')->assertExists($project->cover_image_path);
        foreach ($project->gallery_paths as $path) {
            Storage::disk('public')->assertExists($path);
        }

        // Al actualizar needs omitiendo el primero (con postulaciones), se conserva el primero, se borra el segundo y se crea el tercero.
        $updateResponse = $this->actingAs($owner, 'sanctum')->patchJson("/api/projects/{$projectId}", [
            'needs' => [
                [
                    'title' => 'Especialista IoT',
                    'openings' => 3,
                ],
            ],
        ]);

        $updateResponse->assertOk();
        $this->assertDatabaseHas('project_needs', ['id' => $firstNeedId, 'project_id' => $projectId]);
        $this->assertDatabaseMissing('project_needs', ['id' => $secondNeedId]);
        $this->assertDatabaseHas('project_needs', ['project_id' => $projectId, 'title' => 'Especialista IoT', 'openings' => 3]);

        // Sincronizar eliminando portada y dejando galería vacía
        $clearMedia = $this->actingAs($owner, 'sanctum')->post("/api/publications/proyecto/{$projectId}/media", [
            'remove_cover' => 1,
            'sync_gallery' => 1,
        ]);

        $clearMedia->assertOk()
            ->assertJsonPath('project.cover_image_url', null)
            ->assertJsonCount(0, 'project.gallery');
    }

    public function test_publication_media_rejects_unauthorized_users_and_excess_or_invalid_files(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $stranger = User::factory()->create();
        $category = $this->createCategory();

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba media',
            'description' => 'Descripción larga para pruebas de archivos adjuntos.',
            'status' => 'open',
        ]);

        $this->actingAs($stranger, 'sanctum')
            ->postJson("/api/publications/proyecto/{$project->id}/media", [
                'cover_image' => $this->fakePng('hack.png'),
            ])
            ->assertForbidden();

        $tooMany = [];
        for ($i = 0; $i < 6; $i++) {
            $tooMany[] = $this->fakePng("img{$i}.png");
        }

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/publications/proyecto/{$project->id}/media", [
                'gallery' => $tooMany,
            ])
            ->assertUnprocessable();

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/publications/proyecto/{$project->id}/media", [
                'cover_image' => UploadedFile::fake()->create('documento.pdf', 100, 'application/pdf'),
            ])
            ->assertUnprocessable();
    }

    public function test_community_need_supports_multiple_requirements_and_media(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $category = $this->createCategory();

        $createResponse = $this->actingAs($owner, 'sanctum')->postJson('/api/community-needs', [
            'title' => 'Reforestación de cuenca comunitaria',
            'description' => 'Se requiere apoyo técnico y brigadas para recuperación de zona forestal.',
            'category_id' => $category->id,
            'status' => 'open',
            'location' => 'Sierra Norte, Oaxaca',
            'requirements' => [
                [
                    'title' => 'Asesoría forestal',
                    'required_profile' => 'Ing. Forestal o Biología',
                    'description' => 'Selección de especies nativas',
                    'openings' => 2,
                ],
                [
                    'title' => 'Brigadistas',
                    'openings' => 15,
                ],
            ],
        ]);

        $createResponse->assertCreated()
            ->assertJsonCount(2, 'community_need.requirements')
            ->assertJsonPath('community_need.requirements.0.title', 'Asesoría forestal')
            ->assertJsonPath('community_need.requirements.1.openings', 15);

        $needId = $createResponse->json('community_need.id');

        $this->actingAs($owner, 'sanctum')->post("/api/publications/necesidad/{$needId}/media", [
            'cover_image' => $this->fakePng('cuenca.png'),
            'gallery' => [$this->fakePng('zona.png')],
        ])->assertOk();

        $publicShow = $this->getJson("/api/community-needs/{$needId}");
        $publicShow->assertOk()
            ->assertJsonCount(2, 'community_need.requirements')
            ->assertJsonCount(1, 'community_need.gallery_urls');
        $this->assertNotNull($publicShow->json('community_need.cover_image_url'));
    }
}
