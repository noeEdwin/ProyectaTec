<?php
namespace Tests\Feature;

use App\Models\Category;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class ProjectFileApiTest extends TestCase
{
    use RefreshDatabase;

    private function createProject(array $attributes = []): array
    {
        $owner = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'evidencias-' . uniqid(),
        ]);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba',
            'description' => 'Pruebas de evidencias',
            'status' => 'open',
            ...$attributes,
        ]);

        return [$owner, $project];
    }

    private function fakePdf(int $size = 80): UploadedFile
    {
        return UploadedFile::fake()->create(
            'evidencia.pdf',
            $size,
            'application/pdf'
        );
    }

    private function upload(
        string $url,
        ?UploadedFile $file = null,
        array $extra = []
    ): TestResponse {
        $data = $file === null ? [] : ['file' => $file];

        return $this->post(
            $url,
            array_merge($data, $extra),
            ['Accept' => 'application/json']
        );
    }

    public function test_owner_can_upload_list_and_download_evidence(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();
        $url = "/api/projects/{$project->id}/files";

        $this->actingAs($owner, 'sanctum');

        $this->upload($url, $this->fakePdf())
            ->assertCreated()
            ->assertJsonPath('file.project_id', $project->id)
            ->assertJsonPath('file.original_name', 'evidencia.pdf')
            ->assertJsonPath('file.uploaded_by.id', $owner->id)
            ->assertJsonMissingPath('file.file_path');

        $record = ProjectFile::query()->firstOrFail();

        $this->assertDatabaseHas('project_files', [
            'id' => $record->id,
            'project_id' => $project->id,
            'uploaded_by' => $owner->id,
        ]);

        Storage::disk('local')->assertExists($record->file_path);

        $this->getJson($url)
            ->assertOk()
            ->assertJsonCount(1, 'files')
            ->assertJsonPath('meta.total', 1)
            ->assertJsonMissingPath('files.0.file_path');

        $this->get(
            "/api/projects/{$project->id}/files/{$record->id}/download"
        )
            ->assertOk()
            ->assertDownload('evidencia.pdf');
    }

    public function test_active_member_can_attach_evidence_to_update(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();

        $update = $project->updates()->create([
            'created_by' => $owner->id,
            'title' => 'Avance inicial',
            'description' => 'Trabajo realizado',
            'progress' => 35,
        ]);

        $member = User::factory()->create();

        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $member->id,
            'role' => 'Colaborador',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $url = "/api/projects/{$project->id}/updates/{$update->id}/files";

        $this->actingAs($member, 'sanctum');

        $this->upload($url, $this->fakePdf())
            ->assertCreated()
            ->assertJsonPath('file.project_update_id', $update->id)
            ->assertJsonPath('file.uploaded_by.id', $member->id);

        $this->getJson($url)
            ->assertOk()
            ->assertJsonCount(1, 'files')
            ->assertJsonPath('meta.total', 1);

        $this->assertDatabaseHas('project_files', [
            'project_id' => $project->id,
            'project_update_id' => $update->id,
            'uploaded_by' => $member->id,
        ]);
    }

    public function test_guest_cannot_upload_evidence(): void
    {
        Storage::fake('local');

        [, $project] = $this->createProject();

        $this->upload(
            "/api/projects/{$project->id}/files",
            $this->fakePdf()
        )->assertUnauthorized();

        $this->assertDatabaseCount('project_files', 0);
    }

    public function test_stranger_and_inactive_member_cannot_upload(): void
    {
        Storage::fake('local');

        [, $project] = $this->createProject();
        $url = "/api/projects/{$project->id}/files";

        $stranger = User::factory()->create();
        $this->actingAs($stranger, 'sanctum');

        $this->upload($url, $this->fakePdf())
            ->assertForbidden();

        $member = User::factory()->create();

        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $member->id,
            'role' => 'Colaborador',
            'status' => 'inactive',
            'joined_at' => now(),
        ]);

        $this->actingAs($member, 'sanctum');

        $this->upload($url, $this->fakePdf())
            ->assertForbidden();

        $this->assertDatabaseCount('project_files', 0);
    }

    public function test_disabled_account_cannot_upload(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();
        $owner->update(['is_active' => false]);

        $this->actingAs($owner, 'sanctum');

        $this->upload(
            "/api/projects/{$project->id}/files",
            $this->fakePdf()
        )->assertForbidden();
    }

    public function test_invalid_files_are_rejected(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();
        $url = "/api/projects/{$project->id}/files";

        $this->actingAs($owner, 'sanctum');

        // Archivo obligatorio
        $this->upload($url)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        // Tipo de archivo no permitido
        $this->upload(
            $url,
            UploadedFile::fake()->create(
                'programa.exe',
                20,
                'application/x-msdownload'
            )
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        // Archivo mayor a 5 MB
        $this->upload($url, $this->fakePdf(5121))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('project_files', 0);
    }

    public function test_client_cannot_modify_protected_fields(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();

        $this->actingAs($owner, 'sanctum');

        $this->upload(
            "/api/projects/{$project->id}/files",
            $this->fakePdf(),
            [
                'uploaded_by' => 999,
                'file_path' => 'archivo/falso.pdf',
            ]
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'uploaded_by',
                'file_path',
            ]);

        $this->assertDatabaseCount('project_files', 0);
    }

    public function test_hidden_project_rejects_access_to_evidence(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();
        $this->actingAs($owner, 'sanctum');

        $url = "/api/projects/{$project->id}/files";

        $this->upload($url, $this->fakePdf())
            ->assertCreated();

        $record = ProjectFile::query()->firstOrFail();

        $project->is_hidden = true;
        $project->save();

        $this->getJson($url)->assertNotFound();

        $this->get(
            "/api/projects/{$project->id}/files/{$record->id}/download"
        )->assertNotFound();

        $this->upload($url, $this->fakePdf())
            ->assertNotFound();
    }

    public function test_foreign_update_cannot_receive_evidence(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject();
        [$otherOwner, $otherProject] = $this->createProject();

        $otherUpdate = $otherProject->updates()->create([
            'created_by' => $otherOwner->id,
            'title' => 'Avance externo',
            'description' => 'Otro proyecto',
            'progress' => 30,
        ]);

        $url = "/api/projects/{$project->id}/updates/{$otherUpdate->id}/files";

        $this->getJson($url)->assertNotFound();

        $this->actingAs($owner, 'sanctum');

        $this->upload($url, $this->fakePdf())
            ->assertNotFound();

        $this->assertDatabaseCount('project_files', 0);
    }

    public function test_completed_project_rejects_new_evidence(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createProject([
            'status' => 'completed',
        ]);

        $url = "/api/projects/{$project->id}/files";

        $this->getJson($url)
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->actingAs($owner, 'sanctum');

        $this->upload($url, $this->fakePdf())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('project');

        $this->assertDatabaseCount('project_files', 0);
    }
}
