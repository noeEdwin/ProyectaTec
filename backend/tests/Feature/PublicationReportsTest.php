<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectNeed;
use App\Models\PublicationReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicationReportsTest extends TestCase
{
    use RefreshDatabase;

    private function category(): Category
    {
        return Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia-reportes']);
    }

    private function project(User $author, Category $category, string $status = 'open', ?Organization $organization = null): Project
    {
        return Project::create([
            'created_by' => $author->id,
            'organization_id' => $organization?->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba',
            'description' => 'Descripción',
            'status' => $status,
        ]);
    }

    private function communityNeed(User $author, Category $category, string $status = 'open'): CommunityNeed
    {
        return CommunityNeed::create([
            'created_by' => $author->id,
            'category_id' => $category->id,
            'title' => 'Necesidad comunitaria',
            'description' => 'Descripción',
            'status' => $status,
        ]);
    }

    public function test_authenticated_user_can_report_each_publication_once_and_another_user_can_report_the_same_one(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $anotherReporter = User::factory()->create();
        $category = $this->category();
        $project = $this->project($author, $category);
        $communityNeed = $this->communityNeed($author, $category);

        $this->actingAs($reporter, 'sanctum')->postJson('/api/publication-reports', [
            'project_id' => $project->id,
            'reason' => 'spam',
        ])->assertCreated()
            ->assertJsonPath('report.project_id', $project->id)
            ->assertJsonPath('report.community_need_id', null)
            ->assertJsonPath('report.status', 'pending')
            ->assertJsonPath('report.reporter_id', $reporter->id);

        $this->postJson('/api/publication-reports', [
            'community_need_id' => $communityNeed->id,
            'reason' => 'other',
            'details' => 'Contiene información incorrecta.',
        ])->assertCreated()->assertJsonPath('report.community_need_id', $communityNeed->id);

        $this->postJson('/api/publication-reports', [
            'project_id' => $project->id,
            'reason' => 'inappropriate',
        ])->assertUnprocessable()->assertJsonValidationErrors('project_id');
        $this->postJson('/api/publication-reports', [
            'community_need_id' => $communityNeed->id,
            'reason' => 'spam',
        ])->assertUnprocessable()->assertJsonValidationErrors('community_need_id');

        $this->actingAs($anotherReporter, 'sanctum')->postJson('/api/publication-reports', [
            'project_id' => $project->id,
            'reason' => 'misinformation',
        ])->assertCreated();

        $this->assertDatabaseCount('publication_reports', 3);
        $this->assertDatabaseHas('publication_reports', [
            'reporter_id' => $reporter->id, 'project_id' => $project->id, 'status' => 'pending',
        ]);
        $project->update(['status' => 'closed']);
        $communityNeed->update(['status' => 'withdrawn']);
        $this->assertDatabaseHas('publication_reports', [
            'reporter_id' => $reporter->id, 'project_id' => $project->id,
        ]);
        $this->assertDatabaseHas('publication_reports', [
            'reporter_id' => $reporter->id, 'community_need_id' => $communityNeed->id,
        ]);
        $this->assertDatabaseHas('projects', ['id' => $project->id]);
    }

    public function test_reports_require_auth_valid_target_reason_and_only_one_publication(): void
    {
        $author = User::factory()->create();
        $category = $this->category();
        $project = $this->project($author, $category);
        $communityNeed = $this->communityNeed($author, $category);

        $this->postJson('/api/publication-reports', ['project_id' => $project->id, 'reason' => 'spam'])
            ->assertUnauthorized();
        $this->actingAs(User::factory()->create(), 'sanctum');

        foreach ([
            [[], ['project_id', 'community_need_id', 'reason']],
            [['project_id' => $project->id, 'community_need_id' => $communityNeed->id, 'reason' => 'spam'], ['project_id', 'community_need_id']],
            [['project_id' => $project->id, 'reason' => 'invalid'], ['reason']],
            [['project_id' => $project->id, 'reason' => 'other'], ['details']],
            [['project_id' => $project->id, 'reason' => 'spam', 'status' => 'approved'], ['status']],
            [['project_id' => $project->id, 'reason' => 'spam', 'reporter_id' => $author->id], ['reporter_id']],
            [['community_need_id' => $communityNeed->id, 'reason' => 'spam', 'details' => str_repeat('a', 1001)], ['details']],
        ] as [$payload, $fields]) {
            $this->postJson('/api/publication-reports', $payload)
                ->assertUnprocessable()->assertJsonValidationErrors($fields);
        }

        $this->postJson('/api/publication-reports', ['project_id' => 999999, 'reason' => 'spam'])->assertNotFound();
        $this->postJson('/api/publication-reports', ['community_need_id' => 999999, 'reason' => 'spam'])->assertNotFound();

        $project->update(['status' => 'withdrawn']);
        $communityNeed->update(['status' => 'closed']);
        $this->postJson('/api/publication-reports', ['project_id' => $project->id, 'reason' => 'spam'])->assertNotFound();
        $this->postJson('/api/publication-reports', ['community_need_id' => $communityNeed->id, 'reason' => 'spam'])->assertNotFound();
        $this->assertDatabaseCount('publication_reports', 0);
    }

    public function test_pending_organizations_cannot_be_reported_as_public_projects(): void
    {
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $category = $this->category();
        $organization = Organization::create([
            'name' => 'En revisión', 'organization_type' => 'empresa', 'approval_status' => 'pending',
        ]);
        $project = $this->project($author, $category, 'open', $organization);

        $this->actingAs($reporter, 'sanctum')->postJson('/api/publication-reports', [
            'project_id' => $project->id, 'reason' => 'spam',
        ])->assertNotFound();
        $organization->update(['approval_status' => 'approved']);
        $this->postJson('/api/publication-reports', [
            'project_id' => $project->id, 'reason' => 'spam',
        ])->assertCreated();
    }

    public function test_only_platform_admin_can_read_reports_and_statistics_count_all_types_and_states(): void
    {
        config(['services.proyectatec.admin_emails' => ['moderador@example.com']]);
        $author = User::factory()->create();
        $reporter = User::factory()->create();
        $category = $this->category();
        $openProject = $this->project($author, $category);
        $this->project($author, $category, 'closed');
        $this->communityNeed($author, $category);
        $this->communityNeed($author, $category, 'withdrawn');
        ProjectNeed::create([
            'project_id' => $openProject->id,
            'title' => 'Necesidad del proyecto', 'description' => 'Descripción', 'status' => 'open',
        ]);
        PublicationReport::create([
            'reporter_id' => $reporter->id, 'project_id' => $openProject->id, 'reason' => 'spam', 'status' => 'pending',
        ]);

        $this->getJson('/api/admin/publication-stats')->assertUnauthorized();
        $this->getJson('/api/admin/publication-reports')->assertUnauthorized();
        $this->actingAs($author, 'sanctum')->getJson('/api/admin/publication-stats')->assertForbidden();
        $this->getJson('/api/admin/publication-reports')->assertForbidden();

        $admin = User::factory()->create(['email' => 'moderador@example.com']);
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/publication-stats')
            ->assertOk()
            ->assertJsonPath('total', 5)
            ->assertJsonPath('by_type.projects.total', 2)
            ->assertJsonPath('by_type.projects.by_status.open', 1)
            ->assertJsonPath('by_type.projects.by_status.closed', 1)
            ->assertJsonPath('by_type.community_needs.by_status.withdrawn', 1)
            ->assertJsonPath('by_type.project_needs.by_status.open', 1);

        $this->getJson('/api/admin/publication-reports')
            ->assertOk()
            ->assertJsonCount(1, 'reports')
            ->assertJsonPath('reports.0.project_id', $openProject->id)
            ->assertJsonPath('meta.total', 1);
    }
}
