<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_create_an_organization(): void
    {
        $this->postJson('/api/organizations', [
            'name' => 'Organización de prueba',
            'organization_type' => 'empresa',
        ])->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_an_organization_and_become_its_admin(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/organizations', [
            'name' => 'Empresa de prueba',
            'organization_type' => 'empresa',
            'description' => 'Descripción pública',
            'email' => 'contacto@example.com',
            'location' => 'Oaxaca',
        ]);

        $response->assertCreated()
            ->assertJsonPath('organization.name', 'Empresa de prueba');

        $organizationId = $response->json('organization.id');

        $this->assertDatabaseHas('organizations', [
            'id' => $organizationId,
            'name' => 'Empresa de prueba',
            'email' => 'contacto@example.com',
        ]);

        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organizationId,
            'user_id' => $user->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
    }

    public function test_public_organization_response_does_not_expose_contact_details(): void
    {
        $organization = Organization::create([
            'name' => 'Organización pública',
            'organization_type' => 'institucion_educativa',
            'description' => 'Descripción pública',
            'email' => 'privado@example.com',
            'phone' => '9511234567',
            'location' => 'Oaxaca',
        ]);

        $this->getJson("/api/organizations/{$organization->id}")
            ->assertOk()
            ->assertJsonPath('organization.name', 'Organización pública')
            ->assertJsonPath('organization.location', 'Oaxaca')
            ->assertJsonMissingPath('organization.email')
            ->assertJsonMissingPath('organization.phone')
            ->assertJsonMissingPath('organization.contact');
    }

    public function test_public_organization_not_found_returns_404(): void
    {
        $this->getJson('/api/organizations/999999')->assertNotFound();
    }

    public function test_guest_cannot_update_an_organization(): void
    {
        $organization = $this->makeOrganization();

        $this->patchJson("/api/organizations/{$organization->id}", [
            'name' => 'Cambio no autorizado',
        ])->assertUnauthorized();

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Organización original',
        ]);
    }

    public function test_active_admin_can_update_organization_profile_fields(): void
    {
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}", [
                'name' => 'Organización actualizada',
                'description' => 'Nueva descripción',
                'location' => 'Istmo de Tehuantepec',
                'email' => 'nuevo@example.com',
            ])
            ->assertOk()
            ->assertJsonPath('organization.name', 'Organización actualizada')
            ->assertJsonPath('organization.description', 'Nueva descripción')
            ->assertJsonPath('organization.location', 'Istmo de Tehuantepec')
            ->assertJsonPath('organization.contact.email', 'nuevo@example.com');

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Organización actualizada',
            'description' => 'Nueva descripción',
            'location' => 'Istmo de Tehuantepec',
            'email' => 'nuevo@example.com',
        ]);
    }

    public function test_non_admin_member_cannot_update_an_organization(): void
    {
        $member = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $member->id,
            'role' => 'member',
            'status' => 'active',
        ]);

        $this->actingAs($member, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}", [
                'name' => 'Cambio no autorizado',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Organización original',
        ]);
    }

    public function test_inactive_admin_cannot_update_an_organization(): void
    {
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'inactive',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}", [
                'name' => 'Cambio no autorizado',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Organización original',
        ]);
    }

    public function test_organization_update_rejects_invalid_contact_email(): void
    {
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}", [
                'email' => 'correo-invalido',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_organization_update_requires_at_least_one_editable_field(): void
    {
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $admin->id,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('organization');
    }

    private function makeOrganization(): Organization
    {
        return Organization::create([
            'name' => 'Organización original',
            'organization_type' => 'empresa',
        ]);
    }
}
