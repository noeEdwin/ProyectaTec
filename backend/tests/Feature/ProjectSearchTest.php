<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectSearchTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->category = Category::create(['name' => 'Tecnología', 'slug' => 'tecnologia']);
    }

    private function project(array $attributes = []): Project
    {
        return Project::create(array_merge([
            'created_by' => $this->user->id,
            'category_id' => $this->category->id,
            'title' => 'Proyecto público',
            'description' => 'Descripción pública',
            'status' => 'open',
        ], $attributes));
    }

    private function organization(?string $sector, string $approval = 'approved'): Organization
    {
        return Organization::create([
            'name' => 'Organización',
            'organization_type' => 'empresa',
            'sector' => $sector,
            'approval_status' => $approval,
        ]);
    }

    private function ids(array $parameters = []): array
    {
        $url = '/api/projects'.($parameters ? '?'.http_build_query($parameters) : '');

        return array_column($this->getJson($url)->assertOk()->json('projects'), 'id');
    }

    public function test_unfiltered_list_preserves_public_contract_and_personal_projects(): void
    {
        $project = $this->project();
        $response = $this->getJson('/api/projects')->assertOk()
            ->assertJsonCount(1, 'projects')
            ->assertJsonPath('projects.0.id', $project->id)
            ->assertJsonPath('projects.0.category.id', $this->category->id)
            ->assertJsonPath('projects.0.organization_id', null)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.last_page', 1)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonMissingPath('projects.0.created_by');

        $response->assertJsonStructure(['projects' => [['id', 'title', 'description', 'status', 'category_id', 'category', 'organization_id', 'organization', 'modality', 'location', 'starts_at', 'ends_at', 'created_at', 'updated_at']], 'meta' => ['current_page', 'per_page', 'last_page', 'total']]);
        $this->assertSame([$project->id], $this->ids(['unknown' => 'ignored']));
    }

    public function test_search_matches_literal_substrings_in_title_or_description_case_insensitively_for_ascii(): void
    {
        $title = $this->project(['title' => 'AGUA limpia', 'description' => 'Otro texto']);
        $description = $this->project(['title' => 'Otro título', 'description' => 'Cuidado del AGUA']);
        $this->project(['title' => 'Sin coincidencia', 'description' => 'Otro texto']);

        $this->assertEqualsCanonicalizing([$title->id, $description->id], $this->ids(['q' => '  agu  ']));
        $this->assertSame([], $this->ids(['q' => 'inexistente']));
        $this->assertCount(3, $this->ids(['q' => '']));
        $this->assertCount(3, $this->ids(['q' => '   ']));
    }

    public function test_category_sector_and_combined_filters(): void
    {
        $otherCategory = Category::create(['name' => 'Comunidad', 'slug' => 'comunidad']);
        $matchingOrganization = $this->organization('Tecnología');
        $otherOrganization = $this->organization('Educación');
        $nullOrganization = $this->organization(null);
        $match = $this->project(['title' => 'Agua', 'organization_id' => $matchingOrganization->id]);
        $personal = $this->project(['title' => 'Agua']);
        $this->project(['title' => 'Agua', 'category_id' => $otherCategory->id, 'organization_id' => $matchingOrganization->id]);
        $this->project(['title' => 'Agua', 'organization_id' => $otherOrganization->id]);
        $this->project(['title' => 'Agua', 'organization_id' => $nullOrganization->id]);
        $this->project(['title' => 'Distinto', 'organization_id' => $matchingOrganization->id]);

        $this->assertCount(5, $this->ids(['category_id' => $this->category->id]));
        $this->assertSame([], $this->ids(['category_id' => 999999]));
        $this->assertContains($personal->id, $this->ids(['sector' => '  ']));
        $this->assertNotContains($personal->id, $this->ids(['sector' => 'Tecnología']));
        $this->assertCount(3, $this->ids(['sector' => ' Tecnología ']));
        $this->assertSame([], $this->ids(['sector' => 'tecnología']));
        $this->assertSame([$match->id], $this->ids(['q' => 'agua', 'category_id' => $this->category->id, 'sector' => 'Tecnología']));
    }

    public function test_matching_description_never_bypasses_visibility_rules(): void
    {
        $approved = $this->organization('Salud');
        $pending = $this->organization('Salud', 'pending');
        $visible = $this->project(['title' => 'Visible', 'description' => 'Palabra clave', 'organization_id' => $approved->id]);
        $hidden = $this->project(['title' => 'Oculto', 'description' => 'Palabra clave', 'organization_id' => $approved->id]);
        $hidden->is_hidden = true;
        $hidden->save();
        $this->project(['title' => 'Borrador', 'description' => 'Palabra clave', 'status' => 'draft', 'organization_id' => $approved->id]);
        $this->project(['title' => 'Pendiente', 'description' => 'Palabra clave', 'organization_id' => $pending->id]);

        $this->assertSame([$visible->id], $this->ids(['q' => 'clave']));
        $this->assertSame([$visible->id], $this->ids(['q' => 'clave', 'sector' => 'Salud', 'category_id' => $this->category->id]));
    }

    public function test_search_treats_wildcards_escape_character_and_quotes_as_literals(): void
    {
        $literal = $this->project(['title' => "100%_! 'agua'", 'description' => 'Literal']);
        $this->project(['title' => '100abc agua', 'description' => 'No coincide']);

        foreach (['%', '_', '!', "'agua'", "%_! '"] as $term) {
            $this->assertSame([$literal->id], $this->ids(['q' => $term]));
        }
        $this->assertSame([], $this->ids(['q' => "' OR 1=1 --"]));
    }

    public function test_invalid_filters_return_validation_errors(): void
    {
        foreach ([
            ['q' => ['invalid']], ['q' => str_repeat('x', 256)],
            ['sector' => ['invalid']], ['sector' => str_repeat('x', 256)],
            ['category_id' => 'abc'], ['category_id' => 0], ['category_id' => -1],
            ['category_id' => '9223372036854775808'], ['category_id' => ['1']], ['category_id' => ''],
        ] as $parameters) {
            $this->getJson('/api/projects?'.http_build_query($parameters))
                ->assertUnprocessable()->assertJsonValidationErrors(array_key_first($parameters));
        }
    }

    public function test_filtered_results_are_paginated_and_ordered_by_created_at_then_id(): void
    {
        $ids = [];
        for ($i = 0; $i < 16; $i++) {
            $project = $this->project(['title' => 'Agua']);
            $project->created_at = '2027-01-01 12:00:00';
            $project->save();
            $ids[] = $project->id;
        }
        $older = $this->project(['title' => 'Agua']);
        $older->created_at = '2026-01-01 12:00:00';
        $older->save();
        $this->project(['title' => 'No coincide']);

        $first = $this->getJson('/api/projects?q=agua&page=1')->assertOk()
            ->assertJsonCount(15, 'projects')->assertJsonPath('meta.total', 17)
            ->assertJsonPath('meta.per_page', 15)->assertJsonPath('meta.last_page', 2);
        $second = $this->getJson('/api/projects?q=agua&page=2')->assertOk()
            ->assertJsonCount(2, 'projects')->assertJsonPath('meta.current_page', 2);
        $expected = [...array_reverse($ids), $older->id];
        $this->assertSame(array_slice($expected, 0, 15), array_column($first->json('projects'), 'id'));
        $this->assertSame(array_slice($expected, 15), array_column($second->json('projects'), 'id'));
    }
}
