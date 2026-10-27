<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class OrganizationAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    /**
     * A basic feature test example.
     */
    public function test_guest_cannot_update_organization(): void
{
    $response = $this->patchJson('/api/organizations/1', [
        'name' => 'Cambio no permitido',
    ]);

    $response->assertStatus(401);
}
public function test_member_cannot_update_organization(): void
{
    $user = \App\Models\User::factory()->create();

    $organization = \App\Models\Organization::create([
        'name' => 'Organizacion original',
        'organization_type' => 'empresa',
    ]);

    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => 'member',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->patchJson("/api/organizations/{$organization->id}", [
            'name' => 'Cambio no autorizado',
        ]);

    $response->assertStatus(403);

    $this->assertDatabaseHas('organizations', [
        'id' => $organization->id,
        'name' => 'Organizacion original',
    ]);
}
public function test_admin_can_update_organization(): void
{
    $user = \App\Models\User::factory()->create();

    $organization = \App\Models\Organization::create([
        'name' => 'Organizacion original',
        'organization_type' => 'empresa',
    ]);

    $organization->memberships()->create([
        'user_id' => $user->id,
        'role' => 'admin',
        'status' => 'active',
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->patchJson("/api/organizations/{$organization->id}", [
            'name' => 'Organizacion actualizada',
        ]);

    $response->assertStatus(200);

    $this->assertDatabaseHas('organizations', [
        'id' => $organization->id,
        'name' => 'Organizacion actualizada',
    ]);
}
}
