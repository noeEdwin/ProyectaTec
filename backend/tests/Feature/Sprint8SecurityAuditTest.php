<?php
namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Sprint8SecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'services.proyectatec.admin_emails',
            ['admin-sprint8@example.com']
        );
    }

    public function test_guest_cannot_access_private_endpoints(): void
    {
        $privateRoutes = [
            '/api/me',
            '/api/me/applications',
            '/api/me/notifications',
            '/api/admin/users',
            '/api/admin/publication-reports',
            '/api/admin/organizations/pending',
        ];

        foreach ($privateRoutes as $route) {
            $this->getJson($route)
                ->assertUnauthorized();
        }
    }

    public function test_regular_user_cannot_access_admin_panels(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum');

        $adminRoutes = [
            '/api/admin/users',
            '/api/admin/publications',
            '/api/admin/organizations/pending',
            '/api/admin/publication-reports',
            '/api/admin/publication-stats',
            '/api/admin/profiles/affiliations/pending',
        ];

        foreach ($adminRoutes as $route) {
            $this->getJson($route)
                ->assertForbidden();
        }
    }

    public function test_inactive_user_cannot_use_private_routes(): void
    {
        $user = User::factory()->create([
            'is_active' => false,
        ]);

        $this->actingAs($user, 'sanctum');

        $routes = [
            '/api/me',
            '/api/me/applications',
            '/api/me/notifications',
            '/api/admin/users',
        ];

        foreach ($routes as $route) {
            $this->getJson($route)
                ->assertForbidden();
        }
    }

    public function test_account_type_does_not_grant_admin_permission(): void
    {
        $user = User::factory()->create([
            'account_type' => 'organizacion',
        ]);

        $this->actingAs($user, 'sanctum');

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('can_manage_platform', false);

        $this->getJson('/api/admin/users')
            ->assertForbidden();

        $this->postJson('/api/admin/organizations', [
            'name' => 'Organizacion sin permiso',
            'organization_type' => 'empresa',
        ])->assertForbidden();

        $this->assertDatabaseMissing('organizations', [
            'name' => 'Organizacion sin permiso',
        ]);
    }

    public function test_authorized_admin_can_access_admin_panels(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin-sprint8@example.com',
        ]);

        $this->actingAs($admin, 'sanctum');

        $adminRoutes = [
            '/api/admin/users',
            '/api/admin/publication-reports',
            '/api/admin/publication-stats',
            '/api/admin/organizations/pending',
        ];

        foreach ($adminRoutes as $route) {
            $this->getJson($route)
                ->assertOk();
        }
    }
}
