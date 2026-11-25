<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Organization;
use App\Models\Profile;
use App\Models\Project;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdversarialWorkflowsAndPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function createUserWithProfile(array $userAttrs = [], array $profileAttrs = []): User
    {
        $user = User::factory()->create(array_merge([
            'account_type' => 'estudiante',
            'is_active' => true,
        ], $userAttrs));

        Profile::create(array_merge([
            'user_id' => $user->id,
            'display_name' => $user->name,
        ], $profileAttrs));

        return $user;
    }

    public function test_forgot_password_sends_reset_notification_case_insensitively_and_completes_reset_flow(): void
    {
        Notification::fake();

        $user = $this->createUserWithProfile([
            'email' => 'Estudiante.Reset@ProyectaTec.Test',
            'password' => Hash::make('OldPass#2026!'),
        ]);

        // Create an active Sanctum token that must be revoked after password reset
        $existingToken = $user->createToken('old_session')->plainTextToken;

        // Request reset using different casing and surrounding whitespace
        $response = $this->postJson('/api/forgot-password', [
            'email' => '  estudiante.reset@proyectatec.test  ',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message']);

        $capturedToken = null;
        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use ($user, &$capturedToken) {
            $mail = $notification->toMail($user);
            $this->assertStringContainsString('/restablecer-contrasena?token=', $mail->actionUrl);
            $this->assertStringContainsString('email='.urlencode($user->email), $mail->actionUrl);

            parse_str((string) parse_url($mail->actionUrl, PHP_URL_QUERY), $query);
            $capturedToken = $query['token'] ?? null;

            $html = (string) $mail->render();
            $this->assertStringContainsString('Atentamente,', $html);
            $this->assertStringContainsString('Si tienes problemas para hacer clic', $html);
            $this->assertStringNotContainsString('Regards,', $html);
            $this->assertStringNotContainsString('having trouble clicking', $html);
            $this->assertStringNotContainsString('All rights reserved', $html);

            return ! empty($capturedToken);
        });

        $this->assertNotNull($capturedToken);

        // Weak password must be rejected with 422
        $this->postJson('/api/reset-password', [
            'token' => $capturedToken,
            'email' => 'ESTUDIANTE.RESET@PROYECTATEC.TEST',
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['password']);

        // Valid reset succeeds case-insensitively
        $this->postJson('/api/reset-password', [
            'token' => $capturedToken,
            'email' => 'ESTUDIANTE.RESET@PROYECTATEC.TEST',
            'password' => 'NewSecure#2026!',
            'password_confirmation' => 'NewSecure#2026!',
        ])->assertOk()
            ->assertJsonFragment([
                'message' => 'Tu contraseña se restableció correctamente. Ya puedes iniciar sesión.',
            ]);

        // Reusing the same token must fail
        $this->postJson('/api/reset-password', [
            'token' => $capturedToken,
            'email' => 'estudiante.reset@proyectatec.test',
            'password' => 'AnotherPass#2026!',
            'password_confirmation' => 'AnotherPass#2026!',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        // Old Sanctum tokens were revoked
        $this->assertSame(0, $user->fresh()->tokens()->count());
        $this->assertNotEmpty($existingToken);

        // Old password fails, new password works (case-insensitive login)
        $this->postJson('/api/login', [
            'email' => 'estudiante.reset@proyectatec.test',
            'password' => 'OldPass#2026!',
        ])->assertStatus(401);

        $this->postJson('/api/login', [
            'email' => 'ESTUDIANTE.RESET@PROYECTATEC.TEST',
            'password' => 'NewSecure#2026!',
        ])->assertOk()
            ->assertJsonStructure(['access_token']);
    }

    public function test_forgot_password_does_not_leak_nonexistent_or_deactivated_accounts(): void
    {
        Notification::fake();

        $inactive = $this->createUserWithProfile([
            'email' => 'inactive@proyectatec.test',
            'is_active' => false,
        ]);

        // Non-existent account returns generic 200 without sending email
        $this->postJson('/api/forgot-password', [
            'email' => 'noexiste@proyectatec.test',
        ])->assertOk()
            ->assertJsonFragment([
                'message' => 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
            ]);

        // Deactivated account returns the exact same generic 200 and does NOT send reset email
        $this->postJson('/api/forgot-password', [
            'email' => 'inactive@proyectatec.test',
        ])->assertOk()
            ->assertJsonFragment([
                'message' => 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
            ]);

        Notification::assertNothingSent();

        // Even with a manually forged token, deactivated account cannot reset password
        $token = Password::broker()->createToken($inactive);
        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $inactive->email,
            'password' => 'NewSecure#2026!',
            'password_confirmation' => 'NewSecure#2026!',
        ])->assertStatus(422);
    }

    public function test_register_normalizes_email_and_blocks_case_insensitive_duplicates(): void
    {
        Notification::fake();

        $this->postJson('/api/register', [
            'name' => 'Usuario Mixto',
            'email' => '  Mixto.User@Example.COM ',
            'password' => 'PassSeguro#2026!',
            'password_confirmation' => 'PassSeguro#2026!',
            'account_type' => 'residente_oaxaca',
            'municipality' => 'Oaxaca de Juárez',
            'locality' => 'Centro',
        ])->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'mixto.user@example.com',
        ]);

        // Attempting to register with different case must fail in Spanish
        $this->postJson('/api/register', [
            'name' => 'Otro Usuario',
            'email' => 'MIXTO.USER@example.com',
            'password' => 'PassSeguro#2026!',
            'password_confirmation' => 'PassSeguro#2026!',
            'account_type' => 'residente_oaxaca',
            'municipality' => 'Oaxaca de Juárez',
            'locality' => 'Centro',
        ])->assertStatus(422)
            ->assertJsonPath('errors.email.0', 'Este correo electrónico ya está registrado.');
    }

    public function test_adversarial_inputs_and_edge_cases_never_cause_server_errors(): void
    {
        $category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia']);
        $owner = $this->createUserWithProfile(['account_type' => 'academico']);
        $applicant = $this->createUserWithProfile(['account_type' => 'estudiante']);
        $outsider = $this->createUserWithProfile(['account_type' => 'estudiante']);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto Resiliente',
            'description' => 'Descripción inicial válida.',
            'modality' => 'remota',
            'location' => 'Oaxaca',
            'status' => 'open',
        ]);

        // 1. Non-numeric and nonexistent IDs return 404, never 500
        $this->getJson('/api/projects/abc')->assertStatus(404);
        $this->getJson('/api/projects/999999')->assertStatus(404);
        $this->getJson('/api/community-needs/999999')->assertStatus(404);
        $this->getJson('/api/organizations/999999')->assertStatus(404);

        // 2. Home statistics endpoint works without 404
        $this->getJson('/api/estadisticas/inicio')
            ->assertOk()
            ->assertJsonStructure(['impacto', 'sectores', 'proyectos_activos', 'organizaciones']);

        // 3. Extremely long / malformed inputs on project creation -> 422
        Sanctum::actingAs($owner);
        $this->postJson('/api/projects', [
            'title' => str_repeat('A', 500),
            'description' => str_repeat('B', 10000),
            'category_id' => 999999,
            'modality' => 'telepatia',
        ])->assertStatus(422);

        // 4. Progress update edge cases: out-of-range percentage & outsider attempt
        $this->postJson("/api/projects/{$project->id}/updates", [
            'title' => 'Avance inválido',
            'description' => 'Porcentaje negativo.',
            'progress' => -5,
        ])->assertStatus(422);

        $this->postJson("/api/projects/{$project->id}/updates", [
            'title' => 'Avance inválido',
            'description' => 'Porcentaje mayor a 100.',
            'progress' => 150,
        ])->assertStatus(422);

        // Outsider cannot post progress updates
        Sanctum::actingAs($outsider);
        $this->postJson("/api/projects/{$project->id}/updates", [
            'title' => 'Intento no autorizado',
            'description' => 'Un extraño intenta modificar avances.',
            'progress' => 50,
        ])->assertStatus(403);

        // 5. Owner cannot apply to their own project
        Sanctum::actingAs($owner);
        $this->postJson("/api/projects/{$project->id}/applications", [
            'message' => 'Quiero postularme a mi propio proyecto.',
            'availability' => 'Lunes a viernes',
        ])->assertStatus(422);

        // 6. Applicant applies once -> succeeds; duplicate application -> rejected cleanly
        Sanctum::actingAs($applicant);
        $appResp = $this->postJson("/api/projects/{$project->id}/applications", [
            'message' => '<script>alert("xss")</script> Me interesa apoyar con pruebas.',
            'availability' => 'Tardes',
        ])->assertStatus(201);

        $applicationId = $appResp->json('application.id');
        $this->assertNotNull($applicationId);

        // Duplicate application blocked
        $this->postJson("/api/projects/{$project->id}/applications", [
            'message' => 'Segundo envío duplicado.',
            'availability' => 'Mañanas',
        ])->assertStatus(422);

        // 7. Applicant cannot approve their own application
        $this->patchJson("/api/applications/{$applicationId}", [
            'status' => 'accepted',
        ])->assertStatus(403);

        // 8. Owner accepts application -> succeeds; re-reviewing already decided application is rejected
        Sanctum::actingAs($owner);
        $this->patchJson("/api/applications/{$applicationId}", [
            'status' => 'accepted',
            'review_notes' => 'Bienvenido al equipo.',
        ])->assertOk();

        $this->patchJson("/api/applications/{$applicationId}", [
            'status' => 'rejected',
            'review_notes' => 'Cambio tardío.',
        ])->assertStatus(422);

        // 9. Deactivated user cannot access protected routes even with active session
        $outsider->is_active = false;
        $outsider->save();
        Sanctum::actingAs($outsider);
        $this->getJson('/api/me')->assertStatus(403);
        $this->getJson('/api/me/applications')->assertStatus(403);

        // 10. Regular user cannot access admin moderation endpoints
        Sanctum::actingAs($applicant);
        $this->getJson('/api/admin/users')->assertStatus(403);
        $this->getJson('/api/admin/publications')->assertStatus(403);
        $this->getJson('/api/admin/organizations/pending')->assertStatus(403);
        $this->getJson('/api/admin/publication-reports')->assertStatus(403);

        // 11. Hidden community need cannot be viewed publicly
        $need = CommunityNeed::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Necesidad oculta',
            'description' => 'No debe verse públicamente.',
            'location' => 'Oaxaca',
            'status' => 'open',
        ]);
        $need->is_hidden = true;
        $need->save();

        $this->getJson("/api/community-needs/{$need->id}")->assertStatus(404);
    }

    public function test_closed_or_hidden_project_rejects_new_applications(): void
    {
        $category = Category::create(['name' => 'Educación', 'slug' => 'educacion']);
        $owner = $this->createUserWithProfile(['account_type' => 'academico']);
        $applicant = $this->createUserWithProfile(['account_type' => 'estudiante']);

        $closedProject = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto Cerrado',
            'description' => 'Ya concluyó.',
            'modality' => 'presencial',
            'location' => 'Oaxaca',
            'status' => 'closed',
        ]);

        Sanctum::actingAs($applicant);
        $this->postJson("/api/projects/{$closedProject->id}/applications", [
            'message' => 'Quiero entrar a un proyecto cerrado.',
            'availability' => 'Fines de semana',
        ])->assertStatus(404);

        $this->assertSame(0, Application::where('project_id', $closedProject->id)->count());
    }

    public function test_unapproved_organization_is_hidden_from_public_directory_and_search(): void
    {
        $pending = Organization::create([
            'name' => 'Empresa Secreta Pendiente',
            'organization_type' => 'empresa',
            'sector' => 'Tecnología',
            'location' => 'Oaxaca',
            'approval_status' => 'pending',
        ]);

        $this->getJson('/api/organizations?q=Secreta')
            ->assertOk()
            ->assertJsonMissing(['name' => 'Empresa Secreta Pendiente']);

        $this->getJson("/api/organizations/{$pending->id}")
            ->assertStatus(404);
    }

    public function test_student_expected_graduation_rejects_past_or_invalid_dates_and_accepts_future_dates(): void
    {
        $pastYm = now()->subMonth()->format('Y-m');
        $futureYm = now()->addYears(2)->format('Y-06');

        $registerPayload = [
            'name' => 'Estudiante Prueba Egreso',
            'email' => 'egreso-test@itoaxaca.edu.mx',
            'password' => 'PruebaSegura1!',
            'password_confirmation' => 'PruebaSegura1!',
            'account_type' => 'estudiante',
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '6',
            'student_number' => '23169999',
            'expected_graduation' => $pastYm,
        ];

        $this->postJson('/api/register', $registerPayload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['expected_graduation']);

        $registerPayload['expected_graduation'] = '2025-13';
        $this->postJson('/api/register', $registerPayload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['expected_graduation']);

        $registerPayload['expected_graduation'] = $futureYm;
        $this->postJson('/api/register', $registerPayload)
            ->assertStatus(201);

        $student = User::where('email', 'egreso-test@itoaxaca.edu.mx')->firstOrFail();
        Sanctum::actingAs($student);

        $this->patchJson('/api/me/profile', [
            'account_type' => 'estudiante',
            'display_name' => 'Estudiante Prueba Egreso',
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '6',
            'student_number' => '23169999',
            'expected_graduation' => $pastYm,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['expected_graduation']);

        $this->patchJson('/api/me/profile', [
            'account_type' => 'estudiante',
            'display_name' => 'Estudiante Prueba Egreso',
            'institution' => 'Instituto Tecnológico de Oaxaca',
            'field_of_study' => 'Ingeniería en Sistemas',
            'semester' => '7',
            'student_number' => '23169999',
            'expected_graduation' => $futureYm,
        ])->assertOk()
            ->assertJsonPath('profile.expected_graduation', $futureYm);
    }
}
