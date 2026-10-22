<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Organization;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = [
            [
                'name' => 'Instituto Tecnológico de Oaxaca',
                'organization_type' => 'Universidad',
                'description' => 'Institución educativa superior enfocada en ingeniería y tecnología.',
                'sector' => 'Educación',
                'email' => 'vinculacion@itoaxaca.edu.mx',
                'phone' => '9511234567',
                'location' => 'Av. Víctor Bravo Ahuja 125, Centro, Oaxaca',
            ],
            [
                'name' => 'EcoOaxaca A.C.',
                'organization_type' => 'ONG',
                'description' => 'Organización sin fines de lucro dedicada a la preservación del medio ambiente y manejo de residuos.',
                'sector' => 'Medio Ambiente',
                'email' => 'contacto@ecooaxaca.org',
                'phone' => '9517654321',
                'location' => 'Calle Macedonio Alcalá 400, Centro, Oaxaca',
            ],
            [
                'name' => 'TechSolutions del Sur',
                'organization_type' => 'Empresa',
                'description' => 'Empresa de desarrollo de software y consultoría tecnológica.',
                'sector' => 'Tecnología',
                'email' => 'proyectos@techsolutions.com.mx',
                'phone' => '9515559999',
                'location' => 'Plaza Mazari, Local 12, Reforma, Oaxaca',
            ]
        ];

        foreach ($organizations as $org) {
            Organization::create($org);
        }
    }
}