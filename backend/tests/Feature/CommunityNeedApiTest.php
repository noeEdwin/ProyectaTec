<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityNeedApiTest extends TestCase
{
    use RefreshDatabase;

    private function category(): Category
    {
        return Category::create(['name' => 'Comunidad', 'slug' => 'comunidad']);
    }

    private function payload(Category $category): array
    {
        return [
            'title' => 'Necesidad comunitaria',
            'description' => 'Descripción de la necesidad',
            'category_id' => $category->id,
            'status' => 'open',
        ];
    }

    private function need(User $user, Category $category, string $status = 'open'): CommunityNeed
    {
        return CommunityNeed::create([
            ...$this->payload($category), 'created_by' => $user->id, 'status' => $status,
        ]);
    }

    public function test_authenticated_user_can_create_a_need_with_and_without_location(): void
    {
        $user = User::factory()->create();
        $category = $this->category();

        foreach ([['location' => 'Oaxaca'], [], ['location' => null]] as $optional) {
            $response = $this->actingAs($user, 'sanctum')->postJson('/api/community-needs', [
                ...$this->payload($category), ...$optional,
            ]);

            $response->assertCreated()
                ->assertJsonPath('community_need.title', 'Necesidad comunitaria')
                ->assertJsonPath('community_need.status', 'open')
                ->assertJsonPath('community_need.category_id', $category->id)
                ->assertJsonPath('community_need.location', $optional['location'] ?? null)
                ->assertJsonMissingPath('community_need.created_by')
                ->assertJsonMissingPath('community_need.creator');
            $this->assertDatabaseHas('community_needs', [
                'id' => $response->json('community_need.id'),
                'created_by' => $user->id,
                'category_id' => $category->id,
                'location' => $optional['location'] ?? null,
                'status' => 'open',
            ]);
        }

        $this->assertDatabaseCount('community_needs', 3);
        $this->assertDatabaseCount('projects', 0);
        $this->assertDatabaseCount('project_needs', 0);
    }

    public function test_guest_cannot_create_a_need(): void
    {
        $this->postJson('/api/community-needs', [])->assertUnauthorized();
        $this->assertDatabaseCount('community_needs', 0);
    }

    public function test_required_fields_are_validated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/community-needs', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'description', 'category_id', 'status']);
        $this->assertDatabaseCount('community_needs', 0);
    }

    public function test_invalid_fields_and_nonexistent_categories_are_rejected(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $invalidCases = [
            ['title', str_repeat('a', 256)],
            ['title', ['invalid']],
            ['description', ''],
            ['description', ['invalid']],
            ['category_id', 'not-an-integer'],
            ['category_id', 999999],
            ['location', str_repeat('a', 256)],
            ['location', ['invalid']],
            ['status', 'draft'],
            ['status', 'closed'],
            ['status', 'unknown'],
        ];

        foreach ($invalidCases as [$field, $value]) {
            $this->actingAs($user, 'sanctum')->postJson('/api/community-needs', [
                ...$this->payload($category), $field => $value,
            ])->assertUnprocessable()->assertJsonValidationErrors($field);
        }

        $this->assertDatabaseCount('community_needs', 0);
    }

    public function test_client_cannot_send_creator_project_or_organization_ids(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $category = $this->category();

        foreach (['created_by' => $other->id, 'project_id' => 1, 'organization_id' => 1] as $field => $id) {
            foreach ([$id, null] as $value) {
                $this->actingAs($user, 'sanctum')->postJson('/api/community-needs', [
                    ...$this->payload($category), $field => $value,
                ])->assertUnprocessable()->assertJsonValidationErrors($field);
            }
        }

        $this->assertDatabaseCount('community_needs', 0);
        $this->assertDatabaseCount('projects', 0);
        $this->assertDatabaseCount('project_needs', 0);
    }

    public function test_public_reads_only_show_open_needs(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $open = $this->need($user, $category);
        $draft = $this->need($user, $category, 'draft');
        $closed = $this->need($user, $category, 'closed');
        $unknown = $this->need($user, $category, 'unknown');

        $this->getJson('/api/community-needs')->assertOk()
            ->assertJsonCount(1, 'community_needs')
            ->assertJsonPath('community_needs.0.id', $open->id)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonMissingPath('community_needs.0.created_by')
            ->assertJsonMissingPath('community_needs.0.creator');

        $this->getJson("/api/community-needs/{$open->id}")->assertOk()
            ->assertJsonPath('community_need.id', $open->id)
            ->assertJsonPath('community_need.status', 'open')
            ->assertJsonMissingPath('community_need.created_by')
            ->assertJsonMissingPath('community_need.creator');

        foreach ([$draft, $closed, $unknown] as $hidden) {
            $this->getJson("/api/community-needs/{$hidden->id}")->assertNotFound();
        }
        $this->getJson('/api/community-needs/999999')->assertNotFound();
    }

    public function test_public_list_is_paginated_and_ordered_by_date_then_id(): void
    {
        $user = User::factory()->create();
        $category = $this->category();
        $ids = [];

        for ($i = 0; $i < 16; $i++) {
            $need = $this->need($user, $category);
            $need->created_at = '2027-01-01 12:00:00';
            $need->save();
            $ids[] = $need->id;
        }
        $older = $this->need($user, $category);
        $older->created_at = '2026-01-01 12:00:00';
        $older->save();

        $first = $this->getJson('/api/community-needs')->assertOk()
            ->assertJsonCount(15, 'community_needs')
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonPath('meta.total', 17);
        $second = $this->getJson('/api/community-needs?page=2')->assertOk()
            ->assertJsonCount(2, 'community_needs')
            ->assertJsonPath('meta.current_page', 2);

        $expected = [...array_reverse($ids), $older->id];
        $this->assertSame(array_slice($expected, 0, 15), array_column($first->json('community_needs'), 'id'));
        $this->assertSame(array_slice($expected, 15), array_column($second->json('community_needs'), 'id'));
    }
}
