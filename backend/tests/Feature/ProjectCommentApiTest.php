<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Project;
use App\Models\ProjectMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectCommentApiTest extends TestCase
{
    use RefreshDatabase;

    private function createProjectWithUpdate(): array
    {
        $owner = User::factory()->create();

        $category = Category::create([
            'name' => 'Tecnologia',
            'slug' => 'comentarios-' . uniqid(),
        ]);

        $project = Project::create([
            'created_by' => $owner->id,
            'category_id' => $category->id,
            'title' => 'Proyecto de prueba',
            'description' => 'Proyecto para comentarios',
            'status' => 'open',
        ]);

        $update = $project->updates()->create([
            'created_by' => $owner->id,
            'title' => 'Primer avance',
            'description' => 'Se completo la primera etapa',
            'progress' => 30,
        ]);

        return [$owner, $project, $update];
    }

    public function test_public_can_list_comments(): void
    {
        [$owner, $project, $update] =
            $this->createProjectWithUpdate();

        $comment = $update->comments()->create([
            'user_id' => $owner->id,
            'content' => 'Excelente avance',
        ]);

        $this->getJson(
            "/api/projects/{$project->id}/updates/{$update->id}/comments"
        )
            ->assertOk()
            ->assertJsonCount(1, 'comments')
            ->assertJsonPath('comments.0.id', $comment->id)
            ->assertJsonPath(
                'comments.0.content',
                'Excelente avance'
            )
            ->assertJsonPath('comments.0.user.id', $owner->id)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonMissingPath('comments.0.user.email');
    }

    public function test_guest_cannot_create_comment(): void
    {
        [, $project, $update] =
            $this->createProjectWithUpdate();

        $this->postJson(
            "/api/projects/{$project->id}/updates/{$update->id}/comments",
            ['content' => 'Comentario sin sesion']
        )->assertUnauthorized();

        $this->assertDatabaseCount('project_comments', 0);
    }

    public function test_owner_can_create_comment(): void
    {
        [$owner, $project, $update] =
            $this->createProjectWithUpdate();

        $this->actingAs($owner, 'sanctum')
            ->postJson(
                "/api/projects/{$project->id}/updates/{$update->id}/comments",
                ['content' => 'Buen trabajo']
            )
            ->assertCreated()
            ->assertJsonPath('comment.content', 'Buen trabajo')
            ->assertJsonPath('comment.user.id', $owner->id);

        $this->assertDatabaseHas('project_comments', [
            'project_update_id' => $update->id,
            'user_id' => $owner->id,
            'content' => 'Buen trabajo',
        ]);
    }

    public function test_active_member_can_create_comment(): void
    {
        [, $project, $update] =
            $this->createProjectWithUpdate();

        $member = User::factory()->create();

        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $member->id,
            'role' => 'Colaborador',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->actingAs($member, 'sanctum')
            ->postJson(
                "/api/projects/{$project->id}/updates/{$update->id}/comments",
                ['content' => 'Estoy colaborando']
            )
            ->assertCreated()
            ->assertJsonPath('comment.user.id', $member->id);
    }

    public function test_stranger_cannot_create_comment(): void
    {
        [, $project, $update] =
            $this->createProjectWithUpdate();

        $stranger = User::factory()->create();

        $this->actingAs($stranger, 'sanctum')
            ->postJson(
                "/api/projects/{$project->id}/updates/{$update->id}/comments",
                ['content' => 'Intento sin permiso']
            )
            ->assertForbidden();

        $this->assertDatabaseCount('project_comments', 0);
    }

    public function test_inactive_member_cannot_comment(): void
    {
        [, $project, $update] =
            $this->createProjectWithUpdate();

        $member = User::factory()->create();

        ProjectMember::create([
            'project_id' => $project->id,
            'user_id' => $member->id,
            'role' => 'Colaborador',
            'status' => 'inactive',
            'joined_at' => now(),
        ]);

        $this->actingAs($member, 'sanctum')
            ->postJson(
                "/api/projects/{$project->id}/updates/{$update->id}/comments",
                ['content' => 'No deberia permitirse']
            )
            ->assertForbidden();
    }

    public function test_invalid_data_is_rejected(): void
    {
        [$owner, $project, $update] =
            $this->createProjectWithUpdate();

        $url =
            "/api/projects/{$project->id}/updates/{$update->id}/comments";

        $this->actingAs($owner, 'sanctum');

        $this->postJson($url, [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');

        $this->postJson($url, [
            'content' => str_repeat('a', 2001),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');

        $this->postJson($url, [
            'content' => 'Comentario',
            'user_id' => 999,
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('user_id');

        $this->assertDatabaseCount('project_comments', 0);
    }

    public function test_hidden_project_returns_404(): void
    {
        [$owner, $project, $update] =
            $this->createProjectWithUpdate();

        $project->is_hidden = true;
        $project->save();

        $url =
            "/api/projects/{$project->id}/updates/{$update->id}/comments";

        $this->getJson($url)->assertNotFound();

        $this->actingAs($owner, 'sanctum')
            ->postJson($url, [
                'content' => 'Comentario oculto',
            ])
            ->assertNotFound();
    }

    public function test_update_from_another_project_returns_404(): void
    {
        [$owner, $project] =
            $this->createProjectWithUpdate();

        [, , $otherUpdate] =
            $this->createProjectWithUpdate();

        $url =
            "/api/projects/{$project->id}/updates/{$otherUpdate->id}/comments";

        $this->getJson($url)->assertNotFound();

        $this->actingAs($owner, 'sanctum')
            ->postJson($url, [
                'content' => 'Comentario incorrecto',
            ])
            ->assertNotFound();
    }
}
