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
            ],
            [
                'name' => 'CIIDIR Unidad Oaxaca - IPN',
                'organization_type' => 'Centro de Investigación',
                'description' => 'Centro de investigación enfocado en el desarrollo regional y sustentabilidad.',
                'sector' => 'Ciencia y Tecnología',
                'email' => 'ciidir_oaxaca@ipn.mx',
                'phone' => '9515170610',
                'location' => 'Hornus 100, Noche Buena, Santa Cruz Xoxocotlán, Oaxaca',
            ],
            [
                'name' => 'Clúster Tecnológico de Oaxaca',
                'organization_type' => 'Asociación Civil',
                'description' => 'Red de empresas e instituciones dedicadas al impulso de la industria de software local.',
                'sector' => 'Tecnología',
                'email' => 'contacto@clustertech.oaxaca.gob.mx',
                'phone' => '9515015000',
                'location' => 'Ciudad Administrativa Edificio 5, Talixtac de Cabrera, Oaxaca',
            ],
            [
                'name' => 'Fundación Cultural Zaachila',
                'organization_type' => 'ONG',
                'description' => 'Promoción de la historia, lenguas originarias y patrimonio cultural del valle central.',
                'sector' => 'Cultura y Sociedad',
                'email' => 'info@culturazaachila.org',
                'phone' => '9515280112',
                'location' => 'Barrio San José, Villa de Zaachila, Oaxaca',
            ],
            [
                'name' => 'AgroInnovación de los Valles',
                'organization_type' => 'Empresa',
                'description' => 'Startup agrotech enfocada en optimización de cultivos y automatización de riego.',
                'sector' => 'Agricultura',
                'email' => 'soporte@agrovalles.com',
                'phone' => '9512053344',
                'location' => 'Av. Universidad 200, Cinco Señores, Oaxaca',
            ],
            [
                'name' => 'Salud Comunitarias Oaxaca A.C.',
                'organization_type' => 'ONG',
                'description' => 'Brigadas y brigadistas médicos para la atención primaria en comunidades de difícil acceso.',
                'sector' => 'Salud Pública',
                'email' => 'contacto@saludcomunitaria.org.mx',
                'phone' => '9515148822',
                'location' => 'Calle Heroico Colegio Militar 302, Reforma, Oaxaca',
            ],
        ];

        foreach ($organizations as$org) {
            Organization::create($org);
        }
    }
}