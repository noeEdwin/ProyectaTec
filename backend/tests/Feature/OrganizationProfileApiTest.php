<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_only_their_active_organizations_with_membership_details(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $first = Organization::create([
            'name' => 'Primera',
            'organization_type' => 'empresa',
            'sector' => 'tecnología',
            'description' => 'Descripción',
            'location' => 'Oaxaca',
            'logo_path' => 'logos/primera.png',
            'email' => 'privado@example.com',
            'phone' => '9511234567',
        ]);
        $second = Organization::create([
            'name' => 'Segunda',
            'organization_type' => 'social',
            'sector' => 'educación',
        ]);
        $inactive = Organization::create(['name' => 'Inactiva', 'organization_type' => 'empresa']);
        $other = Organization::create(['name' => 'Ajena', 'organization_type' => 'empresa']);

        $user->organizations()->attach($first->id, [
            'role' => 'admin', 'status' => 'active', 'joined_at' => '2026-10-21 12:00:00',
        ]);
        $user->organizations()->attach($second->id, [
            'role' => 'member', 'status' => 'active', 'joined_at' => null,
        ]);
        $user->organizations()->attach($inactive->id, [
            'role' => 'admin', 'status' => 'inactive',
        ]);
        $otherUser->organizations()->attach($first->id, [
            'role' => 'member', 'status' => 'active',
        ]);
        $otherUser->organizations()->attach($other->id, [
            'role' => 'admin', 'status' => 'active',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/me/organizations')
            ->assertOk()
            ->assertJsonCount(2, 'organizations');

        $organizations = collect($response->json('organizations'))->keyBy('id');
        $this->assertEqualsCanonicalizing([$first->id, $second->id], $organizations->keys()->all());
        $this->assertSame([
            'id' => $first->id,
            'name' => 'Primera',
            'description' => 'Descripción',
            'location' => 'Oaxaca',
            'image' => 'logos/primera.png',
            'classification' => 'empresa - tecnología',
            'membership' => [
                'role' => 'admin',
                'status' => 'active',
                'joined_at' => '2026-10-21T12:00:00.000000Z',
            ],
        ], $organizations[$first->id]);
        $this->assertSame([
            'role' => 'member',
            'status' => 'active',
            'joined_at' => null,
        ], $organizations[$second->id]['membership']);
    }

    public function test_user_without_organizations_receives_an_empty_list(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->getJson('/api/me/organizations')
            ->assertOk()
            ->assertExactJson(['organizations' => []]);
    }

    public function test_guest_cannot_list_own_organizations(): void
    {
        $this->getJson('/api/me/organizations')->assertUnauthorized();
    }

    public function test_created_organization_appears_in_own_organizations(): void
    {
        $user = User::factory()->create();

        $created = $this->actingAs($user, 'sanctum')->postJson('/api/organizations', [
            'name' => 'Nueva organización',
            'organization_type' => 'empresa',
        ])->assertCreated();

        $this->getJson('/api/me/organizations')
            ->assertOk()
            ->assertJsonCount(1, 'organizations')
            ->assertJsonPath('organizations.0.id', $created->json('organization.id'))
            ->assertJsonPath('organizations.0.membership.role', 'admin')
            ->assertJsonPath('organizations.0.membership.status', 'active');
    }

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

    public function test_malformed_public_organization_identifier_returns_404(): void
    {
        $this->getJson('/api/organizations/abc')->assertNotFound();
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
