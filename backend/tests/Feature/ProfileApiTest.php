<?php

namespace Tests\Feature;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

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
            ->assertJsonPath('profile.contact.email', $user->email);
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
}
