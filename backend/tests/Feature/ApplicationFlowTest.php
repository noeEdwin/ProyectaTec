<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\ProjectNeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplicationFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createProjectFixture(array $projectOverrides = [], bool $withOrganization = false): array
    {
        $owner = User::factory()->create();
        $category = Category::create([
            'name' => 'Tecnologia '.uniqid(),
            'slug' => 'tecnologia-'.uniqid(),
        ]);

        $organization = null;
        if ($withOrganization) {
            $organization = Organization::create([
                'name' => 'Org Vinculacion '.uniqid(),
                'organization_type' => 'empresa',
                'approval_status' => 'approved',
            ]);

            OrganizationMember::create([
                'organization_id' => $organization->id,
                'user_id' => $owner->id,
                'role' => 'admin',
                'status' => 'active',
                'joined_at' => now(),
            ]);
        }

        $isHidden = (bool) ($projectOverrides['is_hidden'] ?? false);
        unset($projectOverrides['is_hidden']);

        $project = Project::create([
            'created_by' => $owner->id,
            'organization_id' => $organization?->id,
            'category_id' => $category->id,
            'title' => 'Proyecto Vinculacion',
            'description' => 'Proyecto de prueba para vinculacion',
            'status' => 'open',
            ...$projectOverrides,
        ]);

        if ($isHidden) {
            $project->is_hidden = true;
            $project->save();
        }

        return [$owner, $project, $organization, $category];
    }

    public function test_guests_cannot_access_application_or_notification_endpoints(): void
    {
        $this->postJson('/api/projects/1/applications', ['message' => 'Hola'])->assertStatus(401);
        $this->getJson('/api/projects/1/applications')->assertStatus(401);
        $this->getJson('/api/me/applications')->assertStatus(401);
        $this->getJson('/api/applications/1')->assertStatus(401);
        $this->patchJson('/api/applications/1', ['status' => 'accepted'])->assertStatus(401);
        $this->getJson('/api/me/notifications')->assertStatus(401);
    }

    public function test_authenticated_user_can_submit_application_with_need_and_notify_project_managers(): void
    {
        [$owner, $project, $organization] = $this->createProjectFixture([], true);
        $secondAdmin = User::factory()->create();
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $secondAdmin->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $need = ProjectNeed::create([
            'project_id' => $project->id,
            'title' => 'Desarrollador Backend',
            'description' => 'Apoyo con API Laravel',
            'required_profile' => 'Laravel',
            'openings' => 1,
            'status' => 'open',
        ]);

        $applicant = User::factory()->create();

        $response = $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", [
                'project_need_id' => $need->id,
                'message' => 'Tengo experiencia con Laravel y PostgreSQL.',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('application.project_id', $project->id)
            ->assertJsonPath('application.project_need_id', $need->id)
            ->assertJsonPath('application.user_id', $applicant->id)
            ->assertJsonPath('application.status', 'pending')
            ->assertJsonPath('application.project_need.title', 'Desarrollador Backend');

        $this->assertDatabaseHas('applications', [
            'project_id' => $project->id,
            'project_need_id' => $need->id,
            'user_id' => $applicant->id,
            'status' => 'pending',
        ]);

        $this->assertSame(1, $owner->fresh()->notifications()->count());
        $this->assertSame(1, $secondAdmin->fresh()->notifications()->count());
    }

    public function test_project_creator_and_org_admin_cannot_apply_to_their_own_project(): void
    {
        [$owner, $project, $organization] = $this->createProjectFixture([], true);
        $orgAdmin = User::factory()->create();
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $orgAdmin->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Auto'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project_id');

        $this->actingAs($orgAdmin, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Admin'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project_id');
    }

    public function test_cannot_apply_to_hidden_closed_unapproved_or_completed_projects(): void
    {
        $applicant = User::factory()->create();

        [, $hiddenProject] = $this->createProjectFixture(['is_hidden' => true]);
        [, $draftProject] = $this->createProjectFixture(['status' => 'draft']);
        [, $completedProject] = $this->createProjectFixture(['status' => 'completed']);

        $pendingOrgOwner = User::factory()->create();
        $category = Category::create(['name' => 'Social', 'slug' => 'social-'.uniqid()]);
        $pendingOrg = Organization::create([
            'name' => 'Org Pendiente',
            'organization_type' => 'empresa',
            'approval_status' => 'pending',
        ]);
        $unapprovedOrgProject = Project::create([
            'created_by' => $pendingOrgOwner->id,
            'organization_id' => $pendingOrg->id,
            'category_id' => $category->id,
            'title' => 'Proyecto pendiente',
            'description' => 'No visible',
            'status' => 'open',
            'is_hidden' => false,
        ]);

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$hiddenProject->id}/applications", [])
            ->assertStatus(404);

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$draftProject->id}/applications", [])
            ->assertStatus(404);

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$unapprovedOrgProject->id}/applications", [])
            ->assertStatus(404);

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$completedProject->id}/applications", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project_id');
    }

    public function test_cannot_apply_with_foreign_or_closed_project_need(): void
    {
        [, $projectA] = $this->createProjectFixture();
        [, $projectB] = $this->createProjectFixture();

        $foreignNeed = ProjectNeed::create([
            'project_id' => $projectB->id,
            'title' => 'Necesidad ajena',
            'description' => 'Pertenece a B',
            'openings' => 1,
            'status' => 'open',
        ]);

        $closedNeed = ProjectNeed::create([
            'project_id' => $projectA->id,
            'title' => 'Necesidad cerrada',
            'description' => 'Ya cubierta',
            'openings' => 1,
            'status' => 'closed',
        ]);

        $applicant = User::factory()->create();

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$projectA->id}/applications", [
                'project_need_id' => $foreignNeed->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project_need_id');

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$projectA->id}/applications", [
                'project_need_id' => $closedNeed->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project_need_id');
    }

    public function test_duplicate_active_application_is_blocked_but_reapplication_after_rejection_is_allowed(): void
    {
        [, $project] = $this->createProjectFixture();
        $applicant = User::factory()->create();

        $first = $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Primer intento'])
            ->assertStatus(201);

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Duplicado'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('project_id');

        $applicationId = $first->json('application.id');
        Application::query()->whereKey($applicationId)->update(['status' => 'rejected']);

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Segundo intento'])
            ->assertStatus(201);
    }

    public function test_accepting_application_creates_project_member_and_prevents_re_review(): void
    {
        [$owner, $project, $organization] = $this->createProjectFixture([], true);
        $orgAdmin = User::factory()->create();
        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $orgAdmin->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $applicant = User::factory()->create();

        $created = $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Quiero apoyar'])
            ->assertStatus(201);

        $applicationId = $created->json('application.id');

        $acceptResponse = $this->actingAs($orgAdmin, 'sanctum')
            ->patchJson("/api/applications/{$applicationId}", [
                'status' => 'accepted',
                'review_notes' => 'Bienvenido al equipo.',
                'role' => 'backend_dev',
            ]);

        $acceptResponse->assertStatus(200)
            ->assertJsonPath('application.status', 'accepted')
            ->assertJsonPath('application.reviewed_by', $orgAdmin->id)
            ->assertJsonPath('application.review_notes', 'Bienvenido al equipo.')
            ->assertJsonPath('application.project_member.role', 'backend_dev')
            ->assertJsonPath('application.project_member.status', 'active');

        $this->assertDatabaseHas('project_members', [
            'project_id' => $project->id,
            'user_id' => $applicant->id,
            'application_id' => $applicationId,
            'role' => 'backend_dev',
            'status' => 'active',
        ]);

        // Re-reviewing an already decided application fails with 422
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$applicationId}", [
                'status' => 'rejected',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        // Applicant receives notification and cannot re-apply while already accepted/member
        $this->assertSame(1, $applicant->fresh()->notifications()->count());

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Otra vez'])
            ->assertStatus(422);
    }

    public function test_rejecting_application_does_not_create_project_member_and_notifies_applicant(): void
    {
        [$owner, $project] = $this->createProjectFixture();
        $applicant = User::factory()->create();

        $created = $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Me postulo'])
            ->assertStatus(201);

        $applicationId = $created->json('application.id');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$applicationId}", [
                'status' => 'rejected',
                'review_notes' => 'Cupo cubierto por ahora.',
            ])
            ->assertStatus(200)
            ->assertJsonPath('application.status', 'rejected')
            ->assertJsonPath('application.review_notes', 'Cupo cubierto por ahora.');

        $this->assertDatabaseMissing('project_members', [
            'project_id' => $project->id,
            'user_id' => $applicant->id,
        ]);

        $this->assertSame(1, $applicant->fresh()->notifications()->count());
    }

    public function test_listing_and_viewing_applications_respects_permissions_and_filters(): void
    {
        [$owner, $project] = $this->createProjectFixture();
        [$otherOwner, $otherProject] = $this->createProjectFixture();

        $applicantA = User::factory()->create();
        $applicantB = User::factory()->create();
        $outsider = User::factory()->create();

        $appA = $this->actingAs($applicantA, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'A'])
            ->assertStatus(201)
            ->json('application.id');

        $appB = $this->actingAs($applicantB, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'B'])
            ->assertStatus(201)
            ->json('application.id');

        $this->actingAs($applicantA, 'sanctum')
            ->postJson("/api/projects/{$otherProject->id}/applications", ['message' => 'En otro'])
            ->assertStatus(201);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/applications/{$appA}", ['status' => 'accepted'])
            ->assertStatus(200);

        // Applicant lists own applications (filtered & unfiltered)
        $this->actingAs($applicantA, 'sanctum')
            ->getJson('/api/me/applications')
            ->assertStatus(200)
            ->assertJsonCount(2, 'applications');

        $this->actingAs($applicantA, 'sanctum')
            ->getJson('/api/me/applications?status=accepted')
            ->assertStatus(200)
            ->assertJsonCount(1, 'applications')
            ->assertJsonPath('applications.0.id', $appA);

        // Project owner lists project applications
        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/applications?status=pending")
            ->assertStatus(200)
            ->assertJsonCount(1, 'applications')
            ->assertJsonPath('applications.0.id', $appB);

        // Non-managers cannot list project applications
        $this->actingAs($applicantA, 'sanctum')
            ->getJson("/api/projects/{$project->id}/applications")
            ->assertStatus(403);

        $this->actingAs($otherOwner, 'sanctum')
            ->getJson("/api/projects/{$project->id}/applications")
            ->assertStatus(403);

        // Show single application: applicant and owner allowed, outsider forbidden
        $this->actingAs($applicantA, 'sanctum')
            ->getJson("/api/applications/{$appA}")
            ->assertStatus(200);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/applications/{$appA}")
            ->assertStatus(200);

        $this->actingAs($outsider, 'sanctum')
            ->getJson("/api/applications/{$appA}")
            ->assertStatus(403);
    }

    public function test_notifications_endpoints_list_and_mark_as_read_for_owner_only(): void
    {
        [$owner, $project] = $this->createProjectFixture();
        $applicant = User::factory()->create();
        $otherUser = User::factory()->create();

        $this->actingAs($applicant, 'sanctum')
            ->postJson("/api/projects/{$project->id}/applications", ['message' => 'Hola'])
            ->assertStatus(201);

        $list = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/me/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 1)
            ->assertJsonCount(1, 'notifications');

        $notificationId = $list->json('notifications.0.id');

        $this->actingAs($otherUser, 'sanctum')
            ->patchJson("/api/me/notifications/{$notificationId}/read")
            ->assertStatus(404);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/me/notifications/{$notificationId}/read")
            ->assertStatus(200);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/me/notifications')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 0);

        $this->actingAs($owner, 'sanctum')
            ->patchJson('/api/me/notifications/read-all')
            ->assertStatus(200)
            ->assertJsonPath('unread_count', 0);
    }
}
