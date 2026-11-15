<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Project;
use App\Models\PublicationReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDetailEndpointsTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_can_inspect_hidden_publication_and_full_user_profile(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);

        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $student = User::factory()->create([
            'name' => 'Alumno Ejemplo',
            'email' => 'alumno@example.com',
            'account_type' => 'estudiante',
        ]);
        $student->profile()->create([
            'display_name' => 'Alumno Ejemplo',
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'campus' => 'Central',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '7',
            'student_number' => '21160001',
        ]);
        $reporter = User::factory()->create(['email' => 'reporter@example.com']);
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia']);

        $project = Project::create([
            'created_by' => $student->id,
            'category_id' => $category->id,
            'title' => 'Proyecto Oculto de Prueba',
            'description' => 'Descripción completa que el moderador debe poder ver.',
            'status' => 'open',
            'modality' => 'Híbrida',
            'location' => 'Oaxaca de Juárez',
        ]);
        $project->is_hidden = true;
        $project->save();

        $project->needs()->create([
            'title' => 'Diseñador UI',
            'description' => 'Apoyo en prototipos',
            'required_profile' => 'Diseño',
            'openings' => 2,
            'status' => 'open',
        ]);

        $need = CommunityNeed::create([
            'created_by' => $student->id,
            'category_id' => $category->id,
            'title' => 'Necesidad Oculta',
            'description' => 'Detalle de necesidad comunitaria.',
            'location' => 'Centro',
            'status' => 'open',
        ]);
        $need->is_hidden = true;
        $need->save();

        PublicationReport::create([
            'reporter_id' => $reporter->id,
            'project_id' => $project->id,
            'reason' => 'spam',
            'details' => 'Reporte de prueba',
            'status' => 'pending',
        ]);

        // Un usuario común no puede consultar endpoints de detalle admin.
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/admin/publications/proyecto/{$project->id}")
            ->assertForbidden();
        $this->actingAs($student, 'sanctum')
            ->getJson("/api/admin/users/{$student->id}")
            ->assertForbidden();

        // El admin sí puede ver publicación oculta con necesidades, autor y reportes.
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/publications/proyecto/{$project->id}")
            ->assertOk()
            ->assertJsonPath('publication.title', 'Proyecto Oculto de Prueba')
            ->assertJsonPath('publication.is_hidden', true)
            ->assertJsonPath('publication.author.email', 'alumno@example.com')
            ->assertJsonPath('publication.needs.0.title', 'Diseñador UI')
            ->assertJsonPath('publication.reports.0.reporter.email', 'reporter@example.com');

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/publications/necesidad/{$need->id}")
            ->assertOk()
            ->assertJsonPath('publication.type', 'necesidad')
            ->assertJsonPath('publication.title', 'Necesidad Oculta');

        // El admin sí puede ver el perfil completo del alumno/usuario.
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/users/{$student->id}")
            ->assertOk()
            ->assertJsonPath('user.profile.student_number', '21160001')
            ->assertJsonPath('user.stats.projects_count', 1)
            ->assertJsonPath('user.stats.community_needs_count', 1)
            ->assertJsonPath('user.stats.reports_received_count', 1);
    }

    public function test_pending_queue_includes_applicant_detail_and_unowned_ownership_requests(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $applicant = User::factory()->create(['email' => 'rep@example.com', 'account_type' => 'organizacion']);

        $pendingOrg = Organization::create([
            'name' => 'Empresa Nueva Oaxaca',
            'organization_type' => 'empresa',
            'description' => 'Descripción detallada',
            'approval_status' => 'pending',
        ]);
        OrganizationMember::create([
            'organization_id' => $pendingOrg->id,
            'user_id' => $applicant->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        // Escuela aprobada sin dueño todavía: alguien solicita ser dueño/administrador.
        $unownedSchool = Organization::create([
            'name' => 'Escuela Sin Dueño',
            'organization_type' => 'institucion_educativa',
            'approval_status' => 'approved',
        ]);
        $candidate = User::factory()->create(['email' => 'director@escuela.edu.mx', 'account_type' => 'academico']);
        $membership = OrganizationMember::create([
            'organization_id' => $unownedSchool->id,
            'user_id' => $candidate->id,
            'role' => 'member',
            'requested_role' => 'admin',
            'status' => 'pending',
            'request_note' => 'Soy coordinador institucional',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/organizations/pending')
            ->assertOk()
            ->assertJsonPath('organizations.0.applicant.email', 'rep@example.com')
            ->assertJsonPath('organizations.0.description', 'Descripción detallada')
            ->assertJsonPath('ownership_requests.0.id', $membership->id)
            ->assertJsonPath('ownership_requests.0.user_email', 'director@escuela.edu.mx');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/organizations/{$unownedSchool->id}/member-requests/{$membership->id}", [
                'decision' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('membership.role', 'admin')
            ->assertJsonPath('membership.status', 'active');
    }
}
