<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicOrganizationsDirectoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_directory_lists_only_approved_organizations_with_filters_and_visible_projects_count(): void
    {
        $category = Category::create(['name' => 'Innovación', 'slug' => 'innovacion']);
        $owner = User::factory()->create();

        $approvedCompany = Organization::create([
            'name' => 'Taller Mecatrónico Oaxaca',
            'organization_type' => 'empresa',
            'sector' => 'Manufactura',
            'location' => 'San Sebastián Tutla',
            'approval_status' => 'approved',
            'public_fields' => ['classification'],
        ]);

        $approvedSchool = Organization::create([
            'name' => 'Universidad Tecnológica',
            'organization_type' => 'institucion_educativa',
            'sector' => 'Educación y capacitación',
            'location' => 'Valles Centrales',
            'approval_status' => 'approved',
        ]);

        Organization::create([
            'name' => 'Empresa Pendiente Oculta',
            'organization_type' => 'empresa',
            'approval_status' => 'pending',
        ]);

        // Un proyecto público y otro oculto para verificar el conteo real.
        Project::create([
            'created_by' => $owner->id,
            'organization_id' => $approvedCompany->id,
            'category_id' => $category->id,
            'title' => 'Brazo Robótico Educativo',
            'description' => 'Proyecto activo público.',
            'status' => 'open',
        ]);
        $hiddenProject = Project::create([
            'created_by' => $owner->id,
            'organization_id' => $approvedCompany->id,
            'category_id' => $category->id,
            'title' => 'Proyecto Oculto',
            'description' => 'No debe aparecer.',
            'status' => 'open',
        ]);
        $hiddenProject->is_hidden = true;
        $hiddenProject->save();

        // Catálogo público sin filtros: 2 aprobadas, la privada oculta su ubicación.
        $this->getJson('/api/organizations')
            ->assertOk()
            ->assertJsonCount(2, 'organizations')
            ->assertJsonPath('organizations.0.id', $approvedCompany->id)
            ->assertJsonPath('organizations.0.projects_count', 1)
            ->assertJsonPath('organizations.0.location', null)
            ->assertJsonPath('organizations.1.id', $approvedSchool->id)
            ->assertJsonPath('organizations.1.location', 'Valles Centrales');

        // Filtro por tipo y búsqueda.
        $this->getJson('/api/organizations?type=empresa&q=Mecatr%C3%B3nico')
            ->assertOk()
            ->assertJsonCount(1, 'organizations')
            ->assertJsonPath('organizations.0.name', 'Taller Mecatrónico Oaxaca');

        // Perfil público incluye solo las iniciativas visibles.
        $this->getJson("/api/organizations/{$approvedCompany->id}")
            ->assertOk()
            ->assertJsonPath('organization.organization_type', 'empresa')
            ->assertJsonCount(1, 'organization.projects')
            ->assertJsonPath('organization.projects.0.title', 'Brazo Robótico Educativo');
    }
}
