<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'services.proyectatec.admin_emails',
            ['admin@example.com']
        );
    }

    public function test_guest_cannot_moderate_users(): void
    {
        $target = User::factory()->create();

        $this->patchJson("/api/admin/users/{$target->id}/status", [
            'is_active' => false,
        ])->assertUnauthorized();
    }

    public function test_regular_user_cannot_moderate_users(): void
    {
        $regular = User::factory()->create();
        $target = User::factory()->create();

        $this->actingAs($regular, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}/status", [
                'is_active' => false,
            ])->assertForbidden();

        $this->assertTrue($target->fresh()->is_active);
    }

    public function test_admin_can_deactivate_and_reactivate_user(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $target = User::factory()->create();
        $target->createToken('token-prueba');

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$target->id}/status", [
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('user.is_active', false);

        $this->assertFalse($target->fresh()->is_active);
        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->patchJson("/api/admin/users/{$target->id}/status", [
            'is_active' => true,
        ])
            ->assertOk()
            ->assertJsonPath('user.is_active', true);

        $this->assertTrue($target->fresh()->is_active);
    }

    public function test_admin_cannot_deactivate_self(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/users/{$admin->id}/status", [
                'is_active' => false,
            ])->assertForbidden();

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'is_active' => false,
        ]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertForbidden();
    }
}
