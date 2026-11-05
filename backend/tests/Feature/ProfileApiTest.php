<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_an_avatar_and_read_its_path_and_url(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $profile = Profile::create(['user_id' => $user->id, 'display_name' => 'Mi perfil']);
        $other = Profile::create(['user_id' => $otherUser->id, 'display_name' => 'Otro perfil']);

        $response = $this->actingAs($user, 'sanctum')->post('/api/me/profile/avatar', [
            'avatar' => $this->avatarFile(),
            'user_id' => $otherUser->id,
            'avatar_path' => 'avatars/cliente.png',
        ], ['Accept' => 'application/json'])->assertOk();

        $path = $profile->fresh()->avatar_path;
        $this->assertStringStartsWith('avatars/', $path);
        $this->assertNotSame('avatars/cliente.png', $path);
        Storage::disk('public')->assertExists($path);
        $this->assertNull($other->fresh()->avatar_path);
        $this->assertDatabaseHas('profiles', ['id' => $profile->id, 'avatar_path' => $path]);
        $url = Storage::disk('public')->url($path);
        $response->assertJsonPath('profile.image', $path)->assertJsonPath('profile.image_url', $url);
        $this->getJson('/api/me/profile')->assertJsonPath('profile.image', $path)->assertJsonPath('profile.image_url', $url);
        $this->getJson('/api/profile')->assertJsonPath('data.image', $path)->assertJsonPath('data.image_url', $url);
        $this->getJson("/api/profiles/{$profile->id}")
            ->assertJsonPath('profile.image', $path)->assertJsonPath('profile.image_url', $url);
    }

    public function test_user_can_replace_avatar_without_deleting_the_previous_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        Storage::disk('public')->put('avatars/anterior.png', 'archivo anterior');
        $profile = Profile::create([
            'user_id' => $user->id, 'display_name' => 'Mi perfil', 'avatar_path' => 'avatars/anterior.png',
        ]);

        $this->actingAs($user, 'sanctum')->post('/api/me/profile/avatar', [
            'avatar' => $this->avatarFile(),
        ], ['Accept' => 'application/json'])->assertOk();

        $newPath = $profile->fresh()->avatar_path;
        $this->assertNotSame('avatars/anterior.png', $newPath);
        Storage::disk('public')->assertExists(['avatars/anterior.png', $newPath]);
    }

    public function test_guest_cannot_upload_an_avatar(): void
    {
        Storage::fake('public');
        $this->post('/api/me/profile/avatar', ['avatar' => $this->avatarFile()], ['Accept' => 'application/json'])->assertUnauthorized();
        $this->assertSame([], Storage::disk('public')->allFiles('avatars'));
    }

    public function test_avatar_upload_requires_an_existing_profile(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->post('/api/me/profile/avatar', [
            'avatar' => $this->avatarFile(),
        ], ['Accept' => 'application/json'])->assertStatus(409)->assertJsonPath('message', 'Debes crear tu perfil antes de subir una fotografía.');

        $this->assertDatabaseMissing('profiles', ['user_id' => $user->id]);
        $this->assertSame([], Storage::disk('public')->allFiles('avatars'));
    }

    public function test_avatar_upload_rejects_missing_invalid_svg_and_oversized_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $profile = Profile::create([
            'user_id' => $user->id, 'display_name' => 'Mi perfil', 'avatar_path' => 'avatars/anterior.png',
        ]);
        Storage::disk('public')->put('avatars/anterior.png', 'archivo anterior');
        $this->actingAs($user, 'sanctum');

        foreach ([
            [],
            ['avatar' => 'avatars/archivo.png'],
            ['avatar' => UploadedFile::fake()->createWithContent('invalid.png', 'no es una imagen')],
            ['avatar' => UploadedFile::fake()->createWithContent('imagen.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
            ['avatar' => $this->avatarFile()->size(2049)],
        ] as $payload) {
            $this->post('/api/me/profile/avatar', $payload, ['Accept' => 'application/json'])
                ->assertUnprocessable()->assertJsonValidationErrors('avatar');
        }

        $this->assertSame('avatars/anterior.png', $profile->fresh()->avatar_path);
        $this->assertSame(['avatars/anterior.png'], Storage::disk('public')->allFiles('avatars'));
    }

    public function test_failed_avatar_database_update_removes_only_new_file(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $profile = Profile::create([
            'user_id' => $user->id, 'display_name' => 'Mi perfil', 'avatar_path' => 'avatars/anterior.png',
        ]);
        Storage::disk('public')->put('avatars/anterior.png', 'archivo anterior');

        Profile::updating(function () {
            throw new \RuntimeException('Error de persistencia simulado');
        });

        try {
            $this->actingAs($user, 'sanctum')->post('/api/me/profile/avatar', [
                'avatar' => $this->avatarFile(),
            ], ['Accept' => 'application/json'])->assertStatus(500);
        } finally {
            Profile::flushEventListeners();
        }

        $this->assertSame('avatars/anterior.png', $profile->fresh()->avatar_path);
        $this->assertSame(['avatars/anterior.png'], Storage::disk('public')->allFiles('avatars'));
    }

    private function avatarFile(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('avatar.png', base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
        ));
    }

    // 1. Un visitante no puede consultar su perfil privado.
    public function test_guest_cannot_view_own_profile(): void
    {
        $this->getJson('/api/me/profile')
            ->assertStatus(401);
    }

    // 2. Un perfil público no muestra datos privados.
    public function test_public_profile_hides_private_data(): void
    {
        $user = User::factory()->create();

        $profile = Profile::create([
            'user_id' => $user->id,
            'display_name' => 'Perfil Publico',
            'description' => 'Perfil de prueba',
            'phone' => '9511234567',
            'location' => 'Oaxaca',
        ]);

        $this->getJson("/api/profiles/{$profile->id}")
            ->assertStatus(200)
            ->assertJsonPath('profile.image', null)
            ->assertJsonPath('profile.image_url', null)
            ->assertJsonPath('profile.display_name', 'Perfil Publico')
            ->assertJsonPath('profile.location', 'Oaxaca')
            ->assertJsonMissingPath('profile.phone')
            ->assertJsonMissingPath('profile.email')
            ->assertJsonMissingPath('profile.contact')
            ->assertJsonMissingPath('profile.user_id');
    }

    // 3. Consultar un perfil inexistente devuelve 404.
    public function test_nonexistent_public_profile_returns_404(): void
    {
        $this->getJson('/api/profiles/999999')
            ->assertStatus(404);
    }

    // 3b. Un identificador no numérico devuelve 404 y no un error del servidor.
    public function test_malformed_public_profile_identifier_returns_404(): void
    {
        $this->getJson('/api/profiles/abc')
            ->assertStatus(404);
    }

    // 4. El usuario autenticado puede consultar su perfil.
    public function test_user_can_view_own_profile(): void
    {
        $user = User::factory()->create();

        Profile::create([
            'user_id' => $user->id,
            'display_name' => 'Mi Perfil',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/profile')
            ->assertStatus(200)
            ->assertJsonPath('profile.display_name', 'Mi Perfil')
            ->assertJsonPath('profile.image', null)
            ->assertJsonPath('profile.image_url', null)
            ->assertJsonPath('profile.contact.email', $user->email);
    }

    public function test_profile_endpoint_returns_existing_profile_and_account_data(): void
    {
        $user = User::factory()->create(['account_type' => 'Investigador']);
        $profile = Profile::create([
            'user_id' => $user->id,
            'display_name' => 'Mi Perfil',
            'description' => 'Descripción',
            'phone' => '9511234567',
            'location' => 'Oaxaca',
            'institution' => 'ITO',
            'field_of_study' => 'Sistemas',
            'avatar_path' => 'avatars/perfil.png',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'id', 'is_organization', 'display_name', 'description', 'phone',
                'location', 'institution', 'field_of_study', 'image',
                'contact' => ['phone', 'email'],
                'classification', 'created_at', 'email', 'account_type',
            ]])
            ->assertJsonPath('data.id', $profile->id)
            ->assertJsonPath('data.is_organization', false)
            ->assertJsonPath('data.display_name', 'Mi Perfil')
            ->assertJsonPath('data.description', 'Descripción')
            ->assertJsonPath('data.phone', '9511234567')
            ->assertJsonPath('data.location', 'Oaxaca')
            ->assertJsonPath('data.institution', 'ITO')
            ->assertJsonPath('data.field_of_study', 'Sistemas')
            ->assertJsonPath('data.image', 'avatars/perfil.png')
            ->assertJsonPath('data.contact.phone', '9511234567')
            ->assertJsonPath('data.contact.email', $user->email)
            ->assertJsonPath('data.classification', 'ITO Sistemas')
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.account_type', 'Investigador');
    }

    public function test_profile_endpoint_returns_account_data_when_profile_does_not_exist(): void
    {
        $user = User::factory()->create(['account_type' => 'Investigador']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/profile')
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'id', 'is_organization', 'display_name', 'description', 'phone',
                'location', 'institution', 'field_of_study', 'image',
                'contact' => ['phone', 'email'],
                'classification', 'created_at', 'email', 'account_type',
            ]])
            ->assertJsonPath('data.id', null)
            ->assertJsonPath('data.is_organization', false)
            ->assertJsonPath('data.display_name', $user->name)
            ->assertJsonPath('data.description', '')
            ->assertJsonPath('data.phone', '')
            ->assertJsonPath('data.location', '')
            ->assertJsonPath('data.institution', '')
            ->assertJsonPath('data.field_of_study', '')
            ->assertJsonPath('data.image', null)
            ->assertJsonPath('data.image_url', null)
            ->assertJsonPath('data.contact.phone', '')
            ->assertJsonPath('data.contact.email', $user->email)
            ->assertJsonPath('data.classification', '')
            ->assertJsonPath('data.created_at', null)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.account_type', 'Investigador');
    }

    public function test_existing_profile_can_be_read_and_saved_without_losing_editable_fields(): void
    {
        $user = User::factory()->create();

        Profile::create([
            'user_id' => $user->id,
            'display_name' => 'Mi Perfil',
            'description' => 'Descripcion original',
            'phone' => '9511234567',
            'location' => 'Oaxaca',
            'institution' => 'ITO',
            'field_of_study' => 'Sistemas',
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/me/profile')
            ->assertOk()
            ->assertJsonPath('profile.phone', '9511234567')
            ->assertJsonPath('profile.institution', 'ITO')
            ->assertJsonPath('profile.field_of_study', 'Sistemas');

        $profile = $response->json('profile');

        $this->patchJson('/api/me/profile', [
            'display_name' => $profile['display_name'],
            'description' => $profile['description'],
            'phone' => $profile['phone'],
            'location' => $profile['location'],
            'institution' => $profile['institution'],
            'field_of_study' => $profile['field_of_study'],
        ])->assertOk();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $user->id,
            'phone' => '9511234567',
            'institution' => 'ITO',
            'field_of_study' => 'Sistemas',
        ]);
    }

    // 5. Actualizar mi perfil no modifica el de otro usuario.
    public function test_user_can_update_only_own_profile(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        Profile::create([
            'user_id' => $otherUser->id,
            'display_name' => 'Perfil Ajeno',
        ]);

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/me/profile', [
                'display_name' => 'Mi Perfil Actualizado',
                'location' => 'Oaxaca',
            ])
            ->assertStatus(200);

        $this->assertDatabaseHas('profiles', [
            'user_id' => $user->id,
            'display_name' => 'Mi Perfil Actualizado',
        ]);

        $this->assertDatabaseHas('profiles', [
            'user_id' => $otherUser->id,
            'display_name' => 'Perfil Ajeno',
        ]);
    }

    // 6. No se puede actualizar sin el nombre obligatorio.
    public function test_update_requires_display_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/me/profile', [
                'location' => 'Oaxaca',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['display_name']);
    }

    public function test_repeated_profile_saves_update_the_same_record(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/profile', [
                'display_name' => 'Perfil inicial',
            ])
            ->assertOk()
            ->assertJsonPath('profile.display_name', 'Perfil inicial');

        $this->postJson('/api/profile', [
            'display_name' => 'Perfil modificado',
        ])
            ->assertOk()
            ->assertJsonPath('profile.display_name', 'Perfil modificado');

        $this->assertDatabaseCount('profiles', 1);
        $this->assertDatabaseHas('profiles', [
            'user_id' => $user->id,
            'display_name' => 'Perfil modificado',
        ]);
    }

    public function test_guest_cannot_update_own_profile(): void
    {
        $this->patchJson('/api/me/profile', [
            'display_name' => 'No debe guardarse',
        ])->assertUnauthorized();
    }

    public function test_profile_update_cannot_change_sensitive_account_fields(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $originalPassword = $user->password;

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/me/profile', [
                'display_name' => 'Perfil seguro',
                'user_id' => $otherUser->id,
                'password' => 'nueva-contraseña',
                'role' => 'admin',
            ])
            ->assertOk();

        $this->assertDatabaseHas('profiles', [
            'user_id' => $user->id,
            'display_name' => 'Perfil seguro',
        ]);
        $this->assertDatabaseMissing('profiles', [
            'user_id' => $otherUser->id,
            'display_name' => 'Perfil seguro',
        ]);
        $this->assertSame($originalPassword, $user->fresh()->password);
    }

    public function test_affiliation_changes_are_queued_until_a_platform_admin_approves_them(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $user = User::factory()->create(['account_type' => 'estudiante']);
        $profile = Profile::create([
            'user_id' => $user->id,
            'display_name' => 'Estudiante',
            'institution' => 'Instituto anterior',
            'campus' => 'Oaxaca',
            'field_of_study' => 'Sistemas',
            'semester' => '5',
            'student_number' => 'ITO-111',
            'expected_graduation' => '2028-06',
        ]);

        $this->actingAs($user, 'sanctum')->patchJson('/api/me/profile', [
            'account_type' => 'estudiante',
            'display_name' => 'Estudiante',
            'institution' => 'Instituto nuevo',
            'campus' => 'Oaxaca',
            'field_of_study' => 'Sistemas',
            'semester' => '6',
            'student_number' => 'ITO-111',
            'expected_graduation' => '2028-06',
        ])->assertOk()->assertJsonPath('data.affiliation_status', 'pending');

        $this->assertDatabaseHas('profiles', [
            'id' => $profile->id,
            'institution' => 'Instituto anterior',
            'affiliation_status' => 'pending',
        ]);
        $this->assertSame('Instituto nuevo', $profile->fresh()->pending_affiliation['institution']);

        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/profiles/affiliations/pending')
            ->assertOk()
            ->assertJsonCount(1, 'profiles')
            ->assertJsonPath('profiles.0.pending_affiliation.institution', 'Instituto nuevo');

        $this->patchJson("/api/admin/profiles/{$profile->id}/affiliation", ['decision' => 'approved'])
            ->assertOk()->assertJsonPath('decision', 'approved');
        $this->assertDatabaseHas('profiles', [
            'id' => $profile->id,
            'institution' => 'Instituto nuevo',
            'affiliation_status' => 'current',
            'pending_affiliation' => null,
        ]);
        $this->assertSame('Instituto anterior', $profile->fresh()->affiliation_history[0]['before']['institution']);
    }

    public function test_rejected_affiliation_can_be_requested_again_with_a_reason_and_keeps_old_school(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $user = User::factory()->create(['account_type' => 'estudiante']);
        $profile = Profile::create([
            'user_id' => $user->id, 'display_name' => 'Ana', 'institution' => 'Escuela original',
            'campus' => 'Oaxaca', 'field_of_study' => 'Sistemas', 'semester' => '3',
            'student_number' => '123', 'expected_graduation' => '2028-06',
        ]);
        $request = [
            'account_type' => 'estudiante', 'display_name' => 'Ana',
            'institution' => 'Escuela nueva', 'campus' => 'Oaxaca',
            'field_of_study' => 'Sistemas', 'semester' => '3',
            'student_number' => '123', 'expected_graduation' => '2028-06',
        ];
        $this->actingAs($user, 'sanctum')->patchJson('/api/me/profile', $request)
            ->assertOk()->assertJsonPath('data.affiliation_status', 'pending');
        $this->patchJson("/api/admin/profiles/{$profile->id}/affiliation", ['decision' => 'approved'])
            ->assertForbidden();
        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/profiles/{$profile->id}/affiliation", [
            'decision' => 'rejected',
        ])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->patchJson("/api/admin/profiles/{$profile->id}/affiliation", [
            'decision' => 'rejected', 'reason' => 'Falta confirmar la institución',
        ])->assertOk()->assertJsonPath('profile.affiliation_rejection_reason', 'Falta confirmar la institución');
        $this->assertSame('Escuela original', $profile->fresh()->institution);
        $this->actingAs($user, 'sanctum')->patchJson('/api/me/profile', $request)
            ->assertOk()->assertJsonPath('data.affiliation_status', 'pending');
        $this->assertCount(1, $profile->fresh()->affiliation_history);
        $this->assertSame('Escuela nueva', $profile->fresh()->pending_affiliation['institution']);
    }

    public function test_changing_an_employee_organization_waits_for_review_before_linking_membership(): void
    {
        config(['services.proyectatec.admin_emails' => ['admin@example.com']]);
        $user = User::factory()->create(['account_type' => 'empleado_organizacion']);
        $organization = Organization::create([
            'name' => 'Nueva empresa', 'organization_type' => 'empresa', 'approval_status' => 'approved',
        ]);
        $profile = Profile::create([
            'user_id' => $user->id, 'display_name' => 'Empleado', 'organization_name' => 'Empresa anterior',
        ]);

        $this->actingAs($user, 'sanctum')->patchJson('/api/me/profile', [
            'account_type' => 'empleado_organizacion', 'display_name' => 'Empleado',
            'organization_name' => $organization->name, 'organization_id' => $organization->id,
            'organization_area' => 'Tecnología', 'organization_position' => 'Analista',
        ])->assertOk()->assertJsonPath('data.affiliation_status', 'pending');
        $this->assertSame('Empresa anterior', $profile->fresh()->organization_name);
        $this->assertNull($profile->fresh()->organization_id);
        $this->assertDatabaseMissing('organization_members', [
            'organization_id' => $organization->id, 'user_id' => $user->id,
        ]);

        $admin = User::factory()->create(['email' => 'admin@example.com']);
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/profiles/{$profile->id}/affiliation", [
            'decision' => 'approved',
        ])->assertOk();
        $this->assertDatabaseHas('profiles', [
            'id' => $profile->id, 'organization_name' => $organization->name,
            'organization_id' => $organization->id, 'affiliation_status' => 'current',
        ]);
        $this->assertDatabaseHas('organization_members', [
            'organization_id' => $organization->id, 'user_id' => $user->id,
            'role' => 'member', 'status' => 'active',
        ]);
    }
}
