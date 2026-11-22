<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectNeed;
use App\Models\ProjectUpdate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Sprint7IntegrationAndSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function createOpenProject(): array
    {
        $owner = User::factory()->create();
        $category = Category::create([
            'name' => 'Innovacion '.uniqid(),
            'slug' => 'innovacion-'.uniqid(),
        ]);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto E2E Sprint 7',
            'description' => 'Flujo completo de vinculacion y seguimiento',
            'status' => 'open',
        ]);

        $need = ProjectNeed::create([
            'project_id' => $project->id,
            'title' => 'Desarrollador Fullstack',
            'description' => 'Apoyo en integracion',
            'required_profile' => 'React y Laravel',
            'openings' => 2,
            'status' => 'open',
        ]);

        return [$owner, $project, $need];
    }

    public function test_full_sprint7_end_to_end_workflow_from_application_to_tracking_and_evidence(): void
    {
        Storage::fake('local');

        [$owner, $project, $need] = $this->createOpenProject();
        $applicant = User::factory()->create();

        // 1. Applicant cannot publish updates, comments, or files before acceptance
        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates", [
                'title' => 'Intento sin permiso',
                'description' => 'No soy miembro aun',
                'progress' => 10,
            ])
            ->assertStatus(403);

        // 2. Applicant submits application -> owner notified
        $applyRes = $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", [
                'project_need_id' => $need->id,
                'message' => 'Quiero sumarme al equipo.',
            ])
            ->assertStatus(201);

        $applicationId = $applyRes->json('application.id');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/me/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 1);

        // 3. Owner accepts application -> creates ProjectMember + notifies applicant
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$applicationId}", [
                'status' => 'accepted',
                'review_notes' => 'Bienvenido',
                'role' => 'fullstack',
            ])
            ->assertStatus(200)
            ->assertJsonPath('application.project_member.status', 'active');

        $this->actingAs($applicant, 'sanctum')
            ->getJson('/api/me/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 1);

        // 4. Member appears in public active members list
        $this->getJson("/api/projects/{$project->id}/members")
            ->assertStatus(200)
            ->assertJsonPath('members.0.user.id', $applicant->id)
            ->assertJsonPath('members.0.role', 'fullstack');

        // 5. Accepted member posts update, comment, and evidence file
        $updateRes = $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates", [
                'title' => 'Primer entregable',
                'description' => 'Modulo de vinculacion conectado.',
                'progress' => 45,
            ])
            ->assertStatus(201);

        $updateId = $updateRes->json('project_update.id');

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates/{$updateId}/comments", [
                'content' => 'Adjunto evidencia del avance.',
            ])
            ->assertStatus(201);

        $fileRes = $this->actingAs($applicant, 'sanctum')
            ->post("/api/projects/{$project->id}/updates/{$updateId}/files", [
                'file' => UploadedFile::fake()->create('evidencia.pdf', 120, 'application/pdf'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(201);

        $fileId = $fileRes->json('file.id');

        // 6. Public users can consult updates, comments, files, and download with nosniff header
        $this->getJson("/api/projects/{$project->id}/updates")
            ->assertStatus(200)
            ->assertJsonPath('latest_progress.progress', 45);

        $this->getJson("/api/projects/{$project->id}/updates/{$updateId}/comments")
            ->assertStatus(200)
            ->assertJsonCount(1, 'comments');

        $this->getJson("/api/projects/{$project->id}/updates/{$updateId}/files")
            ->assertStatus(200)
            ->assertJsonCount(1, 'files');

        $this->get("/api/projects/{$project->id}/files/{$fileId}/download")
            ->assertStatus(200)
            ->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_cannot_accept_application_after_project_is_hidden_or_closed_and_hidden_blocks_all_tracking(): void
    {
        Storage::fake('local');

        [$owner, $project] = $this->createOpenProject();
        $applicant = User::factory()->create();

        $app = Application::create([
            'project_id' => $project->id,
            'user_id' => $applicant->id,
            'message' => 'Solicitud pendiente',
            'status' => 'pending',
        ]);

        $update = ProjectUpdate::create([
            'project_id' => $project->id,
            'created_by' => $owner->id,
            'title' => 'Avance previo',
            'description' => 'Antes de ocultar',
            'progress' => 20,
        ]);

        $storedPath = UploadedFile::fake()->create('doc.txt', 10, 'text/plain')->store("project-evidence/{$project->id}", 'local');
        $file = ProjectFile::create([
            'project_id' => $project->id,
            'project_update_id' => $update->id,
            'uploaded_by' => $owner->id,
            'original_name' => 'doc.txt',
            'file_path' => $storedPath,
            'mime_type' => 'text/plain',
            'file_size' => 10,
        ]);

        // Hide project via moderation
        $project->is_hidden = true;
        $project->save();

        // Accepting application on hidden project must fail with 422
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$app->id}", ['status' => 'accepted'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseMissing('project_members', [
            'project_id' => $project->id,
            'user_id' => $applicant->id,
        ]);

        // All public tracking endpoints must return 404 when project is hidden
        $this->getJson("/api/projects/{$project->id}/updates")->assertStatus(404);
        $this->getJson("/api/projects/{$project->id}/updates/{$update->id}/comments")->assertStatus(404);
        $this->getJson("/api/projects/{$project->id}/members")->assertStatus(404);
        $this->getJson("/api/projects/{$project->id}/files")->assertStatus(404);
        $this->get("/api/projects/{$project->id}/files/{$file->id}/download")->assertStatus(404);

        // Rejecting on a closed/hidden project is still allowed cleanly
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$app->id}", ['status' => 'rejected'])
            ->assertStatus(200)
            ->assertJsonPath('application.status', 'rejected');
    }

    public function test_completed_project_blocks_new_comments_and_whitespace_only_comments_are_rejected(): void
    {
        [$owner, $project] = $this->createOpenProject();
        $update = ProjectUpdate::create([
            'project_id' => $project->id,
            'created_by' => $owner->id,
            'title' => 'Avance',
            'description' => 'Detalle',
            'progress' => 50,
        ]);

        // Whitespace-only comment rejected
        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates/{$update->id}/comments", [
                'content' => "   \n\t  ",
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('content');

        // Completed project blocks new comments
        $project->update(['status' => 'completed']);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates/{$update->id}/comments", [
                'content' => 'Comentario tardio',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project');
    }

    public function test_cross_project_idor_malicious_file_uploads_and_prohibited_fields_are_blocked(): void
    {
        Storage::fake('local');

        [$ownerA, $projectA] = $this->createOpenProject();
        [$ownerB, $projectB] = $this->createOpenProject();

        $updateB = ProjectUpdate::create([
            'project_id' => $projectB->id,
            'created_by' => $ownerB->id,
            'title' => 'Avance B',
            'description' => 'Privado de B',
            'progress' => 30,
        ]);

        $pathB = UploadedFile::fake()->create('b.txt', 10, 'text/plain')->store("project-evidence/{$projectB->id}", 'local');
        $fileB = ProjectFile::create([
            'project_id' => $projectB->id,
            'project_update_id' => $updateB->id,
            'uploaded_by' => $ownerB->id,
            'original_name' => 'b.txt',
            'file_path' => $pathB,
            'mime_type' => 'text/plain',
            'file_size' => 10,
        ]);

        // Cross-project file download & comment attempts return 404
        $this->get("/api/projects/{$projectA->id}/files/{$fileB->id}/download")->assertStatus(404);
        $this->actingAs($ownerA, 'sanctum')
            ->postJson("/api/projects/{$projectA->id}/updates/{$updateB->id}/comments", ['content' => 'IDOR'])
            ->assertStatus(404);

        // Disallowed PHP / SVG file types rejected with 422
        $this->actingAs($ownerA, 'sanctum')
            ->post("/api/projects/{$projectA->id}/files", [
                'file' => UploadedFile::fake()->create('shell.php', 10, 'application/x-httpd-php'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');

        $this->actingAs($ownerA, 'sanctum')
            ->post("/api/projects/{$projectA->id}/files", [
                'file' => UploadedFile::fake()->create('xss.svg', 10, 'image/svg+xml'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('file');

        // Path traversal / control chars in filename are sanitized
        $sanitizedRes = $this->actingAs($ownerA, 'sanctum')
            ->post("/api/projects/{$projectA->id}/files", [
                'file' => UploadedFile::fake()->create("../../evil\r\nname.txt", 10, 'text/plain'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(201);

        $this->assertSame('evilname.txt', $sanitizedRes->json('file.original_name'));

        // Prohibited fields injection rejected with 422
        $attacker = User::factory()->create();
        $this->actingAs($attacker, 'sanctum')
            ->postJson("/api/projects/{$projectA->id}/applications", [
                'status' => 'accepted',
                'user_id' => $ownerA->id,
                'message' => 'Escalation',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status', 'user_id']);
    }

    public function test_deactivated_member_loses_write_access_and_disappears_from_members_list(): void
    {
        [$owner, $project] = $this->createOpenProject();
        $member = User::factory()->create();

        $app = $this->actingAs($member, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Me uno'])
            ->assertStatus(201)
            ->json('application.id');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$app}", ['status' => 'accepted'])
            ->assertStatus(200);

        $member->is_active = false;
        $member->save();

        // Deactivated member blocked by EnsureActiveUser (403)
        $this->actingAs($member, 'sanctum')
            ->postJson("/api/projects/{$project->id}/updates", [
                'title' => 'No deberia pasar',
                'description' => 'Cuenta desactivada',
            ])
            ->assertStatus(403);

        // Excluded from public active members list
        $this->getJson("/api/projects/{$project->id}/members")
            ->assertStatus(200)
            ->assertJsonCount(0, 'members');
    }
}
