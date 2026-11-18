<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\WelcomeRegisteredNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetAndWelcomeTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_welcome_notification_by_mail(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Ana Pérez',
            'email' => 'ana.perez@proyectatec.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'account_type' => 'residente_oaxaca',
            'municipality' => 'Oaxaca de Juárez',
            'locality' => 'Centro',
        ]);

        $response->assertStatus(201);

        $user = User::where('email', 'ana.perez@proyectatec.test')->firstOrFail();

        Notification::assertSentTo($user, WelcomeRegisteredNotification::class);
    }

    public function test_forgot_password_sends_reset_link_for_existing_user_and_returns_generic_message(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'usuario@proyectatec.test',
        ]);

        $this->postJson('/api/forgot-password', [
            'email' => 'usuario@proyectatec.test',
        ])
            ->assertStatus(200)
            ->assertJsonStructure(['message']);

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($user) {
            $mail = $notification->toMail($user);

            return str_contains($mail->actionUrl, '/restablecer-contrasena?token=')
                && str_contains($mail->actionUrl, 'email='.urlencode($user->email));
        });

        // Non-existent email returns the same 200 without revealing existence
        $this->postJson('/api/forgot-password', [
            'email' => 'noexiste@proyectatec.test',
        ])
            ->assertStatus(200)
            ->assertJsonStructure(['message']);
    }

    public function test_reset_password_updates_password_revokes_tokens_and_rejects_invalid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'recuperar@proyectatec.test',
            'password' => Hash::make('OldPassword123!'),
        ]);

        $oldToken = $user->createToken('auth_token')->plainTextToken;
        $resetToken = Password::broker()->createToken($user);

        // Invalid token fails with 422
        $this->postJson('/api/reset-password', [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        // Valid token succeeds
        $this->postJson('/api/reset-password', [
            'token' => $resetToken,
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
            ->assertStatus(200);

        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
        $this->assertSame(0, $user->fresh()->tokens()->count());

        // Login works with new password
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'NewPassword123!',
        ])->assertStatus(200);

        // Token cannot be reused
        $this->postJson('/api/reset-password', [
            'token' => $resetToken,
            'email' => $user->email,
            'password' => 'AnotherPassword123!',
            'password_confirmation' => 'AnotherPassword123!',
        ])->assertStatus(422);

        $this->assertNotEmpty($oldToken);
    }
}
