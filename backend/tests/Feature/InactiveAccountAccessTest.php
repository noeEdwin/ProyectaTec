<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InactiveAccountAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_private_routes(): void
    {
        $this->getJson('/api/me')
            ->assertUnauthorized();
    }

    public function test_active_user_can_access_private_routes(): void
    {
        $user = User::factory()->create();

        $token = $user->createToken('test-token')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/me')
            ->assertOk();
    }

    public function test_inactive_user_cannot_use_existing_token(): void
    {
        $user = User::factory()->create();

        $token = $user->createToken('test-token')
            ->plainTextToken;

        $user->update([
            'is_active' => false,
        ]);

        $this->withToken($token)
            ->getJson('/api/me')
            ->assertForbidden();
    }

    public function test_inactive_admin_cannot_access_admin_routes(): void
    {
        config()->set(
            'services.proyectatec.admin_emails',
            ['admin@example.com']
        );

        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'is_active' => false,
        ]);

        $token = $admin->createToken('admin-token')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/admin/publication-reports')
            ->assertForbidden();
    }
}
