<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Project;
use App\Models\PublicationReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicationReportResolutionTest extends TestCase
{
    use RefreshDatabase;

    private function project(User $author): Project
    {
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia-resolucion']);

        return Project::create([
            'created_by' => $author->id,
            'category_id' => $category->id,
            'title' => 'Proyecto reportado',
            'description' => 'Descripción',
            'status' => 'open',
        ]);
    }

    private function report(User $reporter, Project $project): PublicationReport
    {
        return PublicationReport::create([
            'reporter_id' => $reporter->id,
            'project_id' => $project->id,
            'reason' => 'spam',
            'status' => PublicationReport::STATUS_PENDING,
        ]);
    }

    private function admin(string $email = 'moderador@example.com'): User
    {
        config(['services.proyectatec.admin_emails' => [$email]]);

        return User::factory()->create(['email' => $email]);
    }

    public function test_platform_admin_can_review_report_and_decision_is_recorded(): void
    {
        $admin = $this->admin();
        $report = $this->report(User::factory()->create(), $this->project(User::factory()->create()));

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/publication-reports/{$report->id}", [
                'status' => PublicationReport::STATUS_REVIEWED,
                'decision_notes' => 'Se revisó la publicación y cumple las normas.',
            ])
            ->assertOk()
            ->assertJsonPath('report.status', PublicationReport::STATUS_REVIEWED)
            ->assertJsonPath('report.reviewed_by', $admin->id)
            ->assertJsonPath('report.decision_notes', 'Se revisó la publicación y cumple las normas.');

        $resolved = $report->fresh();
        $this->assertNotNull($resolved->reviewed_at);
        $this->assertDatabaseHas('publication_reports', [
            'id' => $report->id,
            'status' => PublicationReport::STATUS_REVIEWED,
            'reviewed_by' => $admin->id,
        ]);
    }

    public function test_admin_can_discard_report_and_notes_are_required(): void
    {
        $admin = $this->admin();
        $report = $this->report(User::factory()->create(), $this->project(User::factory()->create()));

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/publication-reports/{$report->id}", [
                'status' => PublicationReport::STATUS_DISCARDED,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('decision_notes');

        $this->patchJson("/api/admin/publication-reports/{$report->id}", [
            'status' => PublicationReport::STATUS_DISCARDED,
            'decision_notes' => 'El reporte no describe una infracción.',
        ])
            ->assertOk()
            ->assertJsonPath('report.status', PublicationReport::STATUS_DISCARDED)
            ->assertJsonPath('report.reviewed_by', $admin->id);
    }

    public function test_returning_a_report_to_pending_clears_review_data(): void
    {
        $admin = $this->admin();
        $report = $this->report(User::factory()->create(), $this->project(User::factory()->create()));

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/publication-reports/{$report->id}", [
                'status' => PublicationReport::STATUS_REVIEWED,
                'decision_notes' => 'Decisión inicial.',
            ])
            ->assertOk();

        $this->patchJson("/api/admin/publication-reports/{$report->id}", [
            'status' => PublicationReport::STATUS_PENDING,
        ])
            ->assertOk()
            ->assertJsonPath('report.status', PublicationReport::STATUS_PENDING)
            ->assertJsonPath('report.reviewed_by', null)
            ->assertJsonPath('report.reviewed_at', null)
            ->assertJsonPath('report.decision_notes', null);
    }

    public function test_users_without_admin_permission_cannot_resolve_reports(): void
    {
        config(['services.proyectatec.admin_emails' => ['moderador@example.com']]);
        $report = $this->report(User::factory()->create(), $this->project(User::factory()->create()));
        $payload = ['status' => PublicationReport::STATUS_REVIEWED, 'decision_notes' => 'Revisado.'];

        $this->patchJson("/api/admin/publication-reports/{$report->id}", $payload)
            ->assertUnauthorized();

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->patchJson("/api/admin/publication-reports/{$report->id}", $payload)
            ->assertForbidden();

        $inactiveAdmin = User::factory()->create([
            'email' => 'moderador@example.com',
            'is_active' => false,
        ]);
        $this->actingAs($inactiveAdmin, 'sanctum')
            ->patchJson("/api/admin/publication-reports/{$report->id}", $payload)
            ->assertForbidden();

        $this->assertDatabaseHas('publication_reports', [
            'id' => $report->id,
            'status' => PublicationReport::STATUS_PENDING,
        ]);
    }

    public function test_nonexistent_report_returns_not_found(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->patchJson('/api/admin/publication-reports/999999', [
                'status' => PublicationReport::STATUS_REVIEWED,
                'decision_notes' => 'Revisado.',
            ])
            ->assertNotFound();
    }

    public function test_invalid_status_and_missing_notes_are_rejected(): void
    {
        $admin = $this->admin();
        $report = $this->report(User::factory()->create(), $this->project(User::factory()->create()));

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/publication-reports/{$report->id}", [
                'status' => 'approved',
                'decision_notes' => 'Revisado.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->patchJson("/api/admin/publication-reports/{$report->id}", [
            'status' => PublicationReport::STATUS_REVIEWED,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('decision_notes');
    }
}
