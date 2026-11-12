<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityNeedSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->category = Category::create(['name' => 'Comunidad', 'slug' => 'comunidad']);
    }

    private function need(array $attributes = []): CommunityNeed
    {
        return CommunityNeed::create(array_merge([
            'created_by' => $this->user->id,
            'category_id' => $this->category->id,
            'title' => 'Necesidad pública',
            'description' => 'Descripción pública',
            'status' => 'open',
        ], $attributes));
    }

    private function ids(array $parameters = []): array
    {
        $url = '/api/community-needs'.($parameters ? '?'.http_build_query($parameters) : '');

        return array_column($this->getJson($url)->assertOk()->json('community_needs'), 'id');
    }

    public function test_unfiltered_list_preserves_public_contract(): void
    {
        $need = $this->need();
        $response = $this->getJson('/api/community-needs')->assertOk()
            ->assertJsonCount(1, 'community_needs')
            ->assertJsonPath('community_needs.0.id', $need->id)
            ->assertJsonPath('community_needs.0.category.id', $this->category->id)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.last_page', 1)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonMissingPath('community_needs.0.created_by');

        $response->assertJsonStructure([
            'community_needs' => [['id', 'title', 'description', 'status', 'category_id', 'category' => ['id', 'name'], 'location', 'created_at', 'updated_at']],
            'meta' => ['current_page', 'per_page', 'last_page', 'total'],
        ]);
        $this->assertSame([$need->id], $this->ids(['unknown' => 'ignored', 'sector' => 'ignored']));
    }

    public function test_search_matches_title_or_description_and_ascii_case(): void
    {
        $title = $this->need(['title' => 'AGUA limpia', 'description' => 'Otro texto']);
        $description = $this->need(['title' => 'Otro título', 'description' => 'Cuidado del AGUA']);
        $this->need(['title' => 'Sin coincidencia', 'description' => 'Otro texto']);

        $this->assertEqualsCanonicalizing([$title->id, $description->id], $this->ids(['q' => '  agu  ']));
        $this->assertSame([], $this->ids(['q' => 'inexistente']));
        $this->assertCount(3, $this->ids(['q' => '']));
        $this->assertCount(3, $this->ids(['q' => '   ']));
    }

    public function test_category_and_search_filters_can_be_combined(): void
    {
        $otherCategory = Category::create(['name' => 'Educación', 'slug' => 'educacion']);
        $match = $this->need(['title' => 'Agua']);
        $this->need(['title' => 'Alimentos']);
        $this->need(['title' => 'Agua', 'category_id' => $otherCategory->id]);

        $this->assertCount(2, $this->ids(['category_id' => $this->category->id]));
        $this->assertSame([], $this->ids(['category_id' => 999999]));
        $this->assertSame([$match->id], $this->ids(['q' => 'agua', 'category_id' => $this->category->id]));
    }

    public function test_matching_description_never_bypasses_visibility_rules(): void
    {
        $visible = $this->need(['title' => 'Visible', 'description' => 'Palabra clave']);
        $hidden = $this->need(['title' => 'Oculta', 'description' => 'Palabra clave']);
        $hidden->is_hidden = true;
        $hidden->save();
        foreach (['draft', 'closed', 'withdrawn'] as $status) {
            $this->need(['title' => 'No pública', 'description' => 'Palabra clave', 'status' => $status]);
        }

        $this->assertSame([$visible->id], $this->ids(['q' => 'clave']));
        $this->assertSame([$visible->id], $this->ids(['q' => 'clave', 'category_id' => $this->category->id]));
    }

    public function test_search_treats_wildcards_escape_character_and_quotes_as_literals(): void
    {
        $literal = $this->need(['title' => "100%_! 'agua'", 'description' => 'Literal']);
        $this->need(['title' => '100abc agua', 'description' => 'No coincide']);

        foreach (['%', '_', '!', "'agua'", "%_! '"] as $term) {
            $this->assertSame([$literal->id], $this->ids(['q' => $term]));
        }
        $this->assertSame([], $this->ids(['q' => "' OR 1=1 --"]));
    }

    public function test_invalid_filters_return_validation_errors(): void
    {
        foreach ([
            ['q' => ['invalid']], ['q' => str_repeat('x', 256)],
            ['category_id' => 'abc'], ['category_id' => 0], ['category_id' => -1],
            ['category_id' => '9223372036854775808'], ['category_id' => ['1']], ['category_id' => ''],
        ] as $parameters) {
            $this->getJson('/api/community-needs?'.http_build_query($parameters))
                ->assertUnprocessable()->assertJsonValidationErrors(array_key_first($parameters));
        }
    }

    public function test_filtered_results_are_paginated_and_ordered_by_created_at_then_id(): void
    {
        $ids = [];
        for ($i = 0; $i < 16; $i++) {
            $need = $this->need(['title' => 'Agua']);
            $need->created_at = '2027-01-01 12:00:00';
            $need->save();
            $ids[] = $need->id;
        }
        $older = $this->need(['title' => 'Agua']);
        $older->created_at = '2026-01-01 12:00:00';
        $older->save();
        $this->need(['title' => 'No coincide']);

        $first = $this->getJson('/api/community-needs?q=agua&page=1')->assertOk()
            ->assertJsonCount(15, 'community_needs')->assertJsonPath('meta.total', 17)
            ->assertJsonPath('meta.per_page', 15)->assertJsonPath('meta.last_page', 2);
        $second = $this->getJson('/api/community-needs?q=agua&page=2')->assertOk()
            ->assertJsonCount(2, 'community_needs')->assertJsonPath('meta.current_page', 2);
        $expected = [...array_reverse($ids), $older->id];
        $this->assertSame(array_slice($expected, 0, 15), array_column($first->json('community_needs'), 'id'));
        $this->assertSame(array_slice($expected, 15), array_column($second->json('community_needs'), 'id'));
    }
}
