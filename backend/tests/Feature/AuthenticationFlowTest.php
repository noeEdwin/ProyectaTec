<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Profile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AuthenticationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_login_private_route_logout_and_revoked_token(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();

        $registration = $this->postJson('/api/register', [
            'name' => 'Usuario de prueba',
            'email' => 'flujo@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'student',
        ])->assertCreated()->assertJsonStructure(['access_token', 'token_type']);

        $this->withToken($registration->json('access_token'))
            ->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);

        $login = $this->postJson('/api/login', [
            'email' => 'flujo@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonStructure(['access_token', 'token_type']);

        $token = $login->json('access_token');

        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/me')
            ->assertOk()->assertJsonPath('email', 'flujo@example.com');

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_duplicate_email_and_invalid_credentials_are_rejected(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Usuario de prueba',
            'email' => 'flujo@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'student',
        ])->assertCreated();

        $this->postJson('/api/register', [
            'name' => 'Duplicado',
            'email' => 'flujo@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'student',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/login', [
            'email' => 'flujo@example.com',
            'password' => 'incorrecta',
        ])->assertUnauthorized();
    }

    public function test_student_registration_requires_and_persists_conditional_profile_fields(): void
    {
        $base = [
            'name' => 'Estudiante de prueba',
            'email' => 'estudiante-perfil@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'estudiante',
        ];

        $this->postJson('/api/register', $base)
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'institution', 'campus', 'field_of_study', 'semester', 'student_number', 'expected_graduation',
            ]);

        $this->postJson('/api/register', $base + [
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'campus' => 'Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '5',
            'student_number' => 'ITO-12345',
            'expected_graduation' => '2028-06',
            'municipality' => 'Oaxaca de Juárez',
            'locality' => 'Centro',
            'public_fields' => ['institution', 'field_of_study'],
        ])->assertCreated();

        $this->assertDatabaseHas('profiles', [
            'display_name' => 'Estudiante de prueba',
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'campus' => 'Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '5',
            'student_number' => 'ITO-12345',
            'expected_graduation' => '2028-06',
            'location' => 'Centro, Oaxaca de Juárez',
        ]);
    }

    public function test_organization_registration_creates_organization_and_owner_membership(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Representante de prueba',
            'email' => 'representante@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'organizacion',
            'organization_name' => 'Cooperativa de prueba',
            'legal_name' => 'Cooperativa de prueba S.C.',
            'website' => 'https://cooperativa.test',
            'organization_type' => 'sector_social',
            'organization_sector' => 'Economía comunitaria',
            'organization_email' => 'contacto@cooperativa.test',
            'organization_phone' => '9511234567',
            'municipality' => 'Oaxaca de Juárez',
            'locality' => 'Centro',
            'organization_public_fields' => ['location', 'classification'],
        ])->assertCreated();

        $organization = Organization::where('name', 'Cooperativa de prueba')->firstOrFail();
        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->assertSame(['location', 'classification'], $organization->public_fields);
        $this->assertSame('Cooperativa de prueba S.C.', $organization->legal_name);
        $this->assertSame('organizacion', $organization->users()->firstOrFail()->account_type);
    }

    public function test_profile_public_fields_respect_user_privacy_choices(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Privacidad estudiante',
            'email' => 'privacidad@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'account_type' => 'estudiante',
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'campus' => 'Oaxaca',
            'field_of_study' => 'Sistemas',
            'semester' => '5',
            'student_number' => 'PRIV-123',
            'expected_graduation' => '2028-06',
            'municipality' => 'Oaxaca de Juárez',
            'locality' => 'Centro',
            'public_fields' => ['institution'],
        ])->assertCreated();

        $profile = Profile::where('display_name', 'Privacidad estudiante')->firstOrFail();
        $this->getJson("/api/profiles/{$profile->id}")
            ->assertOk()
            ->assertJsonPath('profile.classification', 'Instituto Tecnológico de Oaxaca')
            ->assertJsonPath('profile.location', null)
            ->assertJsonMissingPath('profile.student_number')
            ->assertJsonMissingPath('profile.email');
    }

    public function test_employee_can_select_an_approved_organization_but_not_a_pending_one(): void
    {
        $approved = Organization::create([
            'name' => 'Empresa aprobada', 'organization_type' => 'empresa', 'approval_status' => 'approved',
        ]);
        $pending = Organization::create([
            'name' => 'Empresa pendiente', 'organization_type' => 'empresa', 'approval_status' => 'pending',
        ]);
        $this->getJson('/api/organizations/catalog')->assertOk()
            ->assertJsonCount(1, 'organizations')
            ->assertJsonPath('organizations.0.id', $approved->id);

        $data = [
            'name' => 'Empleado', 'email' => 'empleado@example.com',
            'password' => 'password123', 'password_confirmation' => 'password123',
            'account_type' => 'empleado_organizacion',
            'organization_name' => 'Nombre enviado por el navegador',
            'organization_area' => 'Producción', 'organization_position' => 'Técnico',
        ];
        $this->postJson('/api/register', $data + ['organization_id' => $pending->id])
            ->assertUnprocessable()->assertJsonValidationErrors('organization_id');

        $this->postJson('/api/register', $data + ['organization_id' => $approved->id])->assertCreated();
        $this->assertDatabaseHas('profiles', [
            'organization_id' => $approved->id, 'organization_name' => 'Empresa aprobada',
        ]);
        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $approved->id, 'role' => 'member', 'status' => 'active',
        ]);
    }
}
