<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\User;
use Database\Seeders\OrganizationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstitutionAndRoleFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_provides_verified_oaxaca_institutions_in_catalog(): void
    {
        $this->seed(OrganizationSeeder::class);

        $response = $this->getJson('/api/organizations/catalog')->assertOk();
        $names = collect($response->json('organizations'))
            ->where('organization_type', 'institucion_educativa')
            ->pluck('name');

        $this->assertTrue($names->contains('Instituto Tecnológico de Oaxaca'));
        $this->assertTrue($names->contains('Universidad Autónoma "Benito Juárez" de Oaxaca (UABJO)'));
        $this->assertTrue($names->contains('Universidad Tecnológica de la Mixteca (UTM)'));
    }

    public function test_student_requesting_new_institution_cannot_administer_or_publish_until_admin_approves(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia']);

        $registration = $this->postJson('/api/register', [
            'name' => 'Alumno Nuevo',
            'email' => 'alumno-nueva-inst@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'estudiante',
            'institution' => 'Instituto Nuevo de Oaxaca',
            'request_new_institution' => true,
            'institution_location' => 'Oaxaca de Juárez',
            'campus' => 'Central',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '6',
            'student_number' => '20260001',
            'expected_graduation' => '2027-06',
        ])->assertCreated();

        $token = $registration->json('access_token');
        $organization = Organization::where('name', 'Instituto Nuevo de Oaxaca')->firstOrFail();
        $this->assertSame('institucion_educativa', $organization->organization_type);
        $this->assertSame('pending', $organization->approval_status);

        $student = User::where('email', 'alumno-nueva-inst@example.com')->firstOrFail();
        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $student->id,
        ]);

        $this->withToken($token)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('has_pending_institution_approval', true);

        // No puede publicar proyecto ni necesidad comunitaria mientras la institución siga pendiente.
        $this->withToken($token)->postJson('/api/projects', [
            'title' => 'Proyecto bloqueado',
            'description' => 'Intento antes de aprobación institucional',
            'category_id' => $category->id,
            'status' => 'open',
        ])->assertForbidden();

        $this->withToken($token)->postJson('/api/community-needs', [
            'title' => 'Necesidad bloqueada',
            'description' => 'Intento antes de aprobación institucional',
            'category_id' => $category->id,
            'status' => 'open',
        ])->assertForbidden();

        // El administrador aprueba la institución.
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/organizations/{$organization->id}/approval", [
                'approval_status' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('organization.approval_status', 'approved');

        $this->assertSame('Instituto Nuevo de Oaxaca', $student->profile->fresh()->institution);
        $this->assertSame('current', $student->profile->fresh()->affiliation_status);
        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id,
            'user_id' => $student->id,
            'role' => 'admin',
        ]);

        // Ahora sí puede publicar y la institución aparece en el catálogo oficial.
        $this->actingAs($student->fresh(), 'sanctum')->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('has_pending_institution_approval', false);

        $this->actingAs($student->fresh(), 'sanctum')->postJson('/api/projects', [
            'title' => 'Proyecto habilitado',
            'description' => 'Ya con institución verificada',
            'category_id' => $category->id,
            'status' => 'open',
        ])->assertCreated();
    }

    public function test_only_platform_admin_can_create_verified_institution_directly(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $regularUser = User::factory()->create(['email' => 'user@example.com']);
        $admin = User::factory()->create(['email' => 'admin@example.com']);

        $this->actingAs($regularUser, 'sanctum')->postJson('/api/admin/organizations', [
            'name' => 'Universidad Comunitaria Sierra',
        ])->assertForbidden();

        $this->actingAs($admin, 'sanctum')->postJson('/api/admin/organizations', [
            'name' => 'Universidad Comunitaria Sierra',
            'organization_type' => 'institucion_educativa',
            'location' => 'Sierra Norte, Oaxaca',
        ])->assertCreated()->assertJsonPath('organization.approval_status', 'approved');

        $this->assertDatabaseHas('organizations', [
            'name' => 'Universidad Comunitaria Sierra',
            'approval_status' => 'approved',
        ]);
    }

    public function test_organization_owner_can_approve_member_promotion_to_admin(): void
    {
        $organization = Organization::create([
            'name' => 'Empresa Oaxaca S.A.',
            'organization_type' => 'empresa',
            'approval_status' => 'approved',
        ]);
        $owner = User::factory()->create(['account_type' => 'organizacion']);
        $employee = User::factory()->create(['account_type' => 'empleado_organizacion']);

        OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);
        $membership = OrganizationMember::create([
            'organization_id' => $organization->id,
            'user_id' => $employee->id,
            'role' => 'member',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        // Solicita ascenso a administrador.
        $this->actingAs($employee, 'sanctum')
            ->postJson("/api/organizations/{$organization->id}/role-request", [
                'role' => 'admin',
                'note' => 'Asumí coordinación de proyectos',
            ])
            ->assertCreated()
            ->assertJsonPath('membership.requested_role', 'admin');

        // El empleado normal no puede aprobar su propia solicitud.
        $this->actingAs($employee, 'sanctum')
            ->getJson("/api/organizations/{$organization->id}/member-requests")
            ->assertForbidden();

        // El dueño de la organización revisa y aprueba el ascenso.
        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/organizations/{$organization->id}/member-requests")
            ->assertOk()
            ->assertJsonCount(1, 'requests')
            ->assertJsonPath('requests.0.requested_role', 'admin');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}/member-requests/{$membership->id}", [
                'decision' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('membership.role', 'admin');

        $this->assertDatabaseHas('organization_members', [
            'id' => $membership->id,
            'role' => 'admin',
            'status' => 'active',
            'requested_role' => null,
        ]);
    }

    public function test_account_type_change_within_owned_institution_routes_to_institution_owner(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $platformAdmin = User::factory()->create(['email' => 'admin@example.com']);
        $institution = Organization::create([
            'name' => 'Instituto Tecnológico de Oaxaca',
            'organization_type' => 'institucion_educativa',
            'approval_status' => 'approved',
        ]);
        $institutionOwner = User::factory()->create(['account_type' => 'organizacion']);
        OrganizationMember::create([
            'organization_id' => $institution->id,
            'user_id' => $institutionOwner->id,
            'role' => 'admin',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $student = User::factory()->create(['account_type' => 'estudiante']);
        $studentProfile = $student->profile()->create([
            'display_name' => $student->name,
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '8',
            'student_number' => '20260001',
        ]);

        $this->actingAs($student, 'sanctum')
            ->patchJson('/api/me/profile', [
                'display_name' => $student->name,
                'account_type' => 'academico',
                'institution' => 'Instituto Tecnológico de Oaxaca',
                'academic_role' => 'docente',
                'field_of_study' => 'Ingeniería de Software',
                'affiliation_reason' => 'Egresado y nuevo docente de asignatura',
            ])
            ->assertOk()
            ->assertJsonPath('profile.affiliation_status', 'pending')
            ->assertJsonPath('profile.pending_affiliation.target_organization_id', $institution->id);

        // No debe saturar al administrador general si la institución ya tiene dueño.
        $this->actingAs($platformAdmin, 'sanctum')
            ->getJson('/api/admin/profiles/affiliations/pending')
            ->assertOk()
            ->assertJsonCount(0, 'profiles');

        // Debe aparecer en las solicitudes de la institución para que su dueño la apruebe.
        $this->actingAs($institutionOwner, 'sanctum')
            ->getJson("/api/organizations/{$institution->id}/member-requests")
            ->assertOk()
            ->assertJsonCount(1, 'affiliation_requests')
            ->assertJsonPath('affiliation_requests.0.user_email', $student->email);

        $this->actingAs($institutionOwner, 'sanctum')
            ->patchJson("/api/organizations/{$institution->id}/affiliation-requests/{$studentProfile->id}", [
                'decision' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('profile.account_type', 'academico');

        $this->assertSame('academico', $student->fresh()->account_type);
        $this->assertNull($studentProfile->fresh()->pending_affiliation);
    }
}
