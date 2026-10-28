<?php

namespace Tests\Feature;

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
}
