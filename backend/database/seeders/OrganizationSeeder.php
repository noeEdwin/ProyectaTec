<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $organizations = [
            [
                'name' => 'Instituto Tecnológico de Oaxaca',
                'organization_type' => 'institucion_educativa',
                'description' => 'Institución educativa superior enfocada en ingeniería y tecnología.',
                'sector' => 'Educación y capacitación',
                'email' => 'vinculacion@itoaxaca.edu.mx',
                'phone' => '9511234567',
                'location' => 'Av. Víctor Bravo Ahuja 125, Centro, Oaxaca',
            ],
            [
                'name' => 'EcoOaxaca A.C.',
                'organization_type' => 'sector_social',
                'description' => 'Organización sin fines de lucro dedicada a la preservación del medio ambiente y manejo de residuos.',
                'sector' => 'Medio ambiente y energía',
                'email' => 'contacto@ecooaxaca.org',
                'phone' => '9517654321',
                'location' => 'Calle Macedonio Alcalá 400, Centro, Oaxaca',
            ],
            [
                'name' => 'TechSolutions del Sur',
                'organization_type' => 'empresa',
                'description' => 'Empresa de desarrollo de software y consultoría tecnológica.',
                'sector' => 'Tecnología e innovación',
                'email' => 'proyectos@techsolutions.com.mx',
                'phone' => '9515559999',
                'location' => 'Plaza Mazari, Local 12, Reforma, Oaxaca',
            ],
            [
                'name' => 'CIIDIR Unidad Oaxaca - IPN',
                'organization_type' => 'institucion_educativa',
                'description' => 'Centro de investigación enfocado en el desarrollo regional y sustentabilidad.',
                'sector' => 'Tecnología e innovación',
                'email' => 'ciidir_oaxaca@ipn.mx',
                'phone' => '9515170610',
                'location' => 'Hornus 100, Noche Buena, Santa Cruz Xoxocotlán, Oaxaca',
            ],
            [
                'name' => 'Clúster Tecnológico de Oaxaca',
                'organization_type' => 'sector_social',
                'description' => 'Red de empresas e instituciones dedicadas al impulso de la industria de software local.',
                'sector' => 'Tecnología e innovación',
                'email' => 'contacto@clustertech.oaxaca.gob.mx',
                'phone' => '9515015000',
                'location' => 'Ciudad Administrativa Edificio 5, Talixtac de Cabrera, Oaxaca',
            ],
            [
                'name' => 'Fundación Cultural Zaachila',
                'organization_type' => 'sector_social',
                'description' => 'Promoción de la historia, lenguas originarias y patrimonio cultural del valle central.',
                'sector' => 'Artesanías y cultura',
                'email' => 'info@culturazaachila.org',
                'phone' => '9515280112',
                'location' => 'Barrio San José, Villa de Zaachila, Oaxaca',
            ],
            [
                'name' => 'AgroInnovación de los Valles',
                'organization_type' => 'empresa',
                'description' => 'Startup agrotech enfocada en optimización de cultivos y automatización de riego.',
                'sector' => 'Agroindustria y campo',
                'email' => 'soporte@agrovalles.com',
                'phone' => '9512053344',
                'location' => 'Av. Universidad 200, Cinco Señores, Oaxaca',
            ],
            [
                'name' => 'Salud Comunitarias Oaxaca A.C.',
                'organization_type' => 'sector_social',
                'description' => 'Brigadas y brigadistas médicos para la atención primaria en comunidades de difícil acceso.',
                'sector' => 'Salud y bienestar',
                'email' => 'contacto@saludcomunitaria.org.mx',
                'phone' => '9515148822',
                'location' => 'Calle Heroico Colegio Militar 302, Reforma, Oaxaca',
            ],
        ];

        foreach ($organizations as $org) {
            Organization::updateOrCreate(
                ['name' => $org['name']],
                $org
            );
        }
    }
}
