<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OrganizationProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_admin_can_upload_logo_and_read_its_path_and_url(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);

        $response = $this->actingAs($admin, 'sanctum')->post("/api/organizations/{$organization->id}/logo", [
            'logo' => $this->logoFile(),
            'logo_path' => 'logos/cliente.png',
        ], ['Accept' => 'application/json'])->assertOk();

        $path = $organization->fresh()->logo_path;
        $this->assertStringStartsWith('logos/', $path);
        $this->assertNotSame('logos/cliente.png', $path);
        Storage::disk('public')->assertExists($path);
        $this->assertDatabaseHas('organizations', ['id' => $organization->id, 'logo_path' => $path]);
        $url = Storage::disk('public')->url($path);
        $response->assertJsonPath('organization.image', $path)->assertJsonPath('organization.image_url', $url);
        $this->getJson("/api/organizations/{$organization->id}")
            ->assertJsonPath('organization.image', $path)->assertJsonPath('organization.image_url', $url);
        $this->getJson('/api/me/organizations')
            ->assertJsonPath('organizations.0.image', $path)->assertJsonPath('organizations.0.image_url', $url);
        $this->patchJson("/api/organizations/{$organization->id}", ['name' => 'Actualizada'])
            ->assertOk()->assertJsonPath('organization.image', $path)->assertJsonPath('organization.image_url', $url);
    }

    public function test_logo_upload_requires_authentication_and_active_admin_membership(): void
    {
        Storage::fake('public');
        $organization = $this->makeOrganization();
        $url = "/api/organizations/{$organization->id}/logo";
        $headers = ['Accept' => 'application/json'];
        $this->post($url, ['logo' => $this->logoFile()], $headers)->assertUnauthorized();

        $outsider = User::factory()->create();
        $member = User::factory()->create();
        $inactive = User::factory()->create();
        $organization->memberships()->create(['user_id' => $member->id, 'role' => 'member', 'status' => 'active']);
        $organization->memberships()->create(['user_id' => $inactive->id, 'role' => 'admin', 'status' => 'inactive']);

        foreach ([$outsider, $member, $inactive] as $user) {
            $this->actingAs($user, 'sanctum')->post($url, ['logo' => $this->logoFile()], $headers)->assertForbidden();
        }

        $this->assertNull($organization->fresh()->logo_path);
        $this->assertSame([], Storage::disk('public')->allFiles('logos'));
    }

    public function test_logo_upload_rejects_unknown_and_invalid_organization_ids(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        foreach (['999999', 'abc'] as $id) {
            $this->post("/api/organizations/{$id}/logo", ['logo' => $this->logoFile()], [
                'Accept' => 'application/json',
            ])->assertNotFound();
        }

        $this->assertSame([], Storage::disk('public')->allFiles('logos'));
    }

    public function test_logo_upload_rejects_invalid_files_without_changing_previous_logo(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->update(['logo_path' => 'logos/anterior.png']);
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        Storage::disk('public')->put('logos/anterior.png', 'anterior');
        $this->actingAs($admin, 'sanctum');

        foreach ([
            [],
            ['logo' => 'logos/cliente.png'],
            ['logo' => UploadedFile::fake()->createWithContent('falso.png', 'no es una imagen')],
            ['logo' => UploadedFile::fake()->createWithContent('imagen.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
            ['logo' => $this->logoFile()->size(2049)],
        ] as $payload) {
            $this->post("/api/organizations/{$organization->id}/logo", $payload, ['Accept' => 'application/json'])
                ->assertUnprocessable()->assertJsonValidationErrors('logo');
        }

        $this->assertSame('logos/anterior.png', $organization->fresh()->logo_path);
        $this->assertSame(['logos/anterior.png'], Storage::disk('public')->allFiles('logos'));
    }

    public function test_logo_upload_rejects_valid_png_with_excessive_dimensions(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->update(['logo_path' => 'logos/anterior.png']);
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        Storage::disk('public')->put('logos/anterior.png', 'anterior');

        $chunk = static function (string $type, string $data): string {
            return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        };
        $png = "\x89PNG\r\n\x1a\n"
            .$chunk('IHDR', pack('NNC5', 4097, 1, 8, 2, 0, 0, 0))
            .$chunk('IDAT', gzcompress("\x00".str_repeat("\x00", 4097 * 3)))
            .$chunk('IEND', '');
        $file = UploadedFile::fake()->createWithContent('ancho-excesivo.png', $png);
        $image = getimagesize($file->getRealPath());
        $this->assertIsArray($image);
        $this->assertSame(4097, $image[0]);
        $this->assertSame(1, $image[1]);
        $this->assertSame('image/png', $image['mime']);

        $this->actingAs($admin, 'sanctum')->post("/api/organizations/{$organization->id}/logo", [
            'logo' => $file,
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('logo')
            ->assertJsonPath('errors.logo.0', trans('validation.dimensions', ['attribute' => 'logo']));

        $this->assertSame('logos/anterior.png', $organization->fresh()->logo_path);
        $this->assertSame(['logos/anterior.png'], Storage::disk('public')->allFiles('logos'));
    }

    public function test_logo_replacement_keeps_previous_file(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->update(['logo_path' => 'logos/anterior.png']);
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        Storage::disk('public')->put('logos/anterior.png', 'anterior');

        $this->actingAs($admin, 'sanctum')->post("/api/organizations/{$organization->id}/logo", [
            'logo' => $this->logoFile(),
        ], ['Accept' => 'application/json'])->assertOk();

        $path = $organization->fresh()->logo_path;
        $this->assertNotSame('logos/anterior.png', $path);
        Storage::disk('public')->assertExists(['logos/anterior.png', $path]);
    }

    public function test_logo_storage_failure_preserves_previous_logo(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->update(['logo_path' => 'logos/anterior.png']);
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        $disk = Storage::disk('public');
        $disk->put('logos/anterior.png', 'anterior');
        $failingDisk = \Mockery::mock($disk)->makePartial();
        $failingDisk->shouldReceive('putFileAs')->once()->andReturn(false);
        Storage::set('public', $failingDisk);

        $this->actingAs($admin, 'sanctum')->post("/api/organizations/{$organization->id}/logo", [
            'logo' => $this->logoFile(),
        ], ['Accept' => 'application/json'])->assertStatus(500);

        $this->assertSame('logos/anterior.png', $organization->fresh()->logo_path);
        $disk->assertExists('logos/anterior.png');
        $this->assertSame(['logos/anterior.png'], $disk->allFiles('logos'));
    }

    public function test_logo_database_failure_removes_only_new_file(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->update(['logo_path' => 'logos/anterior.png']);
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        Storage::disk('public')->put('logos/anterior.png', 'anterior');
        Organization::updating(function () {
            throw new \RuntimeException('Error de persistencia simulado');
        });

        try {
            $this->actingAs($admin, 'sanctum')->post("/api/organizations/{$organization->id}/logo", [
                'logo' => $this->logoFile(),
            ], ['Accept' => 'application/json'])->assertStatus(500);
        } finally {
            Organization::flushEventListeners();
        }

        $this->assertSame('logos/anterior.png', $organization->fresh()->logo_path);
        $this->assertSame(['logos/anterior.png'], Storage::disk('public')->allFiles('logos'));
    }

    public function test_organization_responses_handle_missing_and_legacy_logo_paths(): void
    {
        Storage::fake('public');
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create(['user_id' => $admin->id, 'role' => 'admin', 'status' => 'active']);
        $this->actingAs($admin, 'sanctum');

        $this->getJson("/api/organizations/{$organization->id}")
            ->assertJsonPath('organization.image', null)->assertJsonPath('organization.image_url', null);
        $this->getJson('/api/me/organizations')
            ->assertJsonPath('organizations.0.image', null)->assertJsonPath('organizations.0.image_url', null);
        $this->patchJson("/api/organizations/{$organization->id}", ['name' => 'Sin logo'])
            ->assertJsonPath('organization.image', null)->assertJsonPath('organization.image_url', null);

        foreach (['https://example.com/logo.png', '/storage/logo.png', '../logo.png', 'C:\\logo.png'] as $path) {
            $organization->update(['logo_path' => $path]);
            $this->getJson("/api/organizations/{$organization->id}")
                ->assertJsonPath('organization.image', $path)->assertJsonPath('organization.image_url', null);
        }
    }

    private function logoFile(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('logo.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
        ));
    }

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
            'image_url' => \App\Http\Resources\OrganizationResource::logoUrl('logos/primera.png'),
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
            ->assertJsonPath('organization.name', 'Empresa de prueba')
            ->assertJsonPath('organization.image', null)
            ->assertJsonPath('organization.image_url', null);

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

    public function test_creation_accepts_each_allowed_organization_type(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        foreach (['empresa', 'institucion_educativa', 'sector_social'] as $type) {
            $response = $this->postJson('/api/organizations', [
                'name' => 'Organización '.$type,
                'organization_type' => $type,
            ])->assertCreated();

            $this->assertDatabaseHas('organizations', [
                'id' => $response->json('organization.id'),
                'organization_type' => $type,
            ]);
        }
    }

    public function test_creation_rejects_invalid_empty_null_and_missing_organization_types(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        foreach (['desconocido', 'Empresa', 'social', '', null] as $type) {
            $this->postJson('/api/organizations', [
                'name' => 'No debe crearse',
                'organization_type' => $type,
            ])->assertUnprocessable()->assertJsonValidationErrors('organization_type');
        }

        $this->postJson('/api/organizations', ['name' => 'No debe crearse'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('organization_type');

        $this->assertDatabaseMissing('organizations', ['name' => 'No debe crearse']);
    }

    public function test_active_admin_can_update_to_each_allowed_organization_type(): void
    {
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $admin->id, 'role' => 'admin', 'status' => 'active',
        ]);
        $this->actingAs($admin, 'sanctum');

        foreach (['empresa', 'institucion_educativa', 'sector_social'] as $type) {
            $this->patchJson("/api/organizations/{$organization->id}", [
                'organization_type' => $type,
            ])->assertOk();

            $this->assertDatabaseHas('organizations', [
                'id' => $organization->id, 'organization_type' => $type,
            ]);
        }
    }

    public function test_update_rejects_invalid_empty_and_null_organization_types(): void
    {
        $admin = User::factory()->create();
        $organization = $this->makeOrganization();
        $organization->memberships()->create([
            'user_id' => $admin->id, 'role' => 'admin', 'status' => 'active',
        ]);
        $this->actingAs($admin, 'sanctum');

        foreach (['desconocido', 'Empresa', 'social', '', null] as $type) {
            $this->patchJson("/api/organizations/{$organization->id}", [
                'organization_type' => $type,
            ])->assertUnprocessable()->assertJsonValidationErrors('organization_type');

            $this->assertDatabaseHas('organizations', [
                'id' => $organization->id, 'organization_type' => 'empresa',
            ]);
        }
    }

    public function test_update_can_omit_organization_type_and_preserves_legacy_value(): void
    {
        $admin = User::factory()->create();
        $organization = Organization::create([
            'name' => 'Organización anterior', 'organization_type' => 'Empresa',
        ]);
        $organization->memberships()->create([
            'user_id' => $admin->id, 'role' => 'admin', 'status' => 'active',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/organizations/{$organization->id}", ['name' => 'Nombre actualizado'])
            ->assertOk();

        $this->assertDatabaseHas('organizations', [
            'id' => $organization->id,
            'name' => 'Nombre actualizado',
            'organization_type' => 'Empresa',
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

    public function test_authenticated_user_can_see_organization_edit_permissions(): void
    {
        $user = User::factory()->create();
        $adminOrganization = $this->makeOrganization('Organización administrada');
        $memberOrganization = $this->makeOrganization('Organización miembro');

        $adminOrganization->memberships()->create([
            'user_id' => $user->id,
            'role' => 'admin',
            'status' => 'active',
        ]);
        $memberOrganization->memberships()->create([
            'user_id' => $user->id,
            'role' => 'member',
            'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/organizations')
            ->assertOk()
            ->assertJsonPath('organizations.0.can_update', true)
            ->assertJsonPath('organizations.0.role', 'admin')
            ->assertJsonPath('organizations.1.can_update', false)
            ->assertJsonPath('organizations.1.role', 'member');
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

    private function makeOrganization(string $name = 'Organización original'): Organization
    {
        return Organization::create([
            'name' => $name,
            'organization_type' => 'empresa',
        ]);
    }
}
