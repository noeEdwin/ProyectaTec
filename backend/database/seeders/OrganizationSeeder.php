<?php

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $verifiedInstitutions = [
            [
                'name' => 'Instituto Tecnológico de Oaxaca',
                'description' => 'Institución educativa superior enfocada en ingeniería y tecnología.',
                'email' => 'vinculacion@itoaxaca.edu.mx',
                'phone' => '9511234567',
                'location' => 'Av. Víctor Bravo Ahuja 125, Centro, Oaxaca de Juárez, Oaxaca',
                'website' => 'https://www.itoaxaca.edu.mx',
            ],
            [
                'name' => 'Instituto Tecnológico del Valle de Oaxaca',
                'description' => 'Institución tecnológica enfocada en ciencias agropecuarias, biología e ingeniería en Oaxaca.',
                'location' => 'Ex-Hacienda de Nazareno, Santa Cruz Xoxocotlán, Oaxaca',
                'website' => 'https://www.voaxaca.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico de Tuxtepec',
                'description' => 'Campus del TecNM en la región de la Cuenca del Papaloapan.',
                'location' => 'Calz. Dr. Víctor Bravo Ahuja s/n, San Juan Bautista Tuxtepec, Oaxaca',
                'website' => 'https://www.tuxtepec.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico de Salina Cruz',
                'description' => 'Campus del TecNM en el Istmo de Tehuantepec orientado a ingeniería naval, industrial y TIC.',
                'location' => 'Carretera a San Antonio Monterrey km 1.7, Salina Cruz, Oaxaca',
                'website' => 'https://www.salinacruz.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico de Pinotepa',
                'description' => 'Campus del TecNM en la región de la Costa de Oaxaca.',
                'location' => 'Av. Tecnológico s/n, Santiago Pinotepa Nacional, Oaxaca',
                'website' => 'https://www.pinotepa.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico de Comitancillo',
                'description' => 'Institución del TecNM en el Istmo especializada en desarrollo rural, agronomía e informática.',
                'location' => 'Carretera Ixtaltepec-Comitancillo km 7.5, San Pedro Comitancillo, Oaxaca',
                'website' => 'https://www.comitancillo.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico de Pochutla',
                'description' => 'Campus del TecNM en la Costa orientado a turismo sustentable, administración y sistemas.',
                'location' => 'Carretera Puerto Ángel km 1.5, San Pedro Pochutla, Oaxaca',
                'website' => 'https://www.pochutla.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico del Istmo',
                'description' => 'Campus del TecNM en Heroica Ciudad de Juchitán de Zaragoza.',
                'location' => 'Carretera Panamericana km 821, Heroica Ciudad de Juchitán de Zaragoza, Oaxaca',
                'website' => 'https://www.istmo.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico de Tlaxiaco',
                'description' => 'Campus del TecNM en la región Mixteca de Oaxaca.',
                'location' => 'Blvd. Tecnológico km 2.5, Heroica Ciudad de Tlaxiaco, Oaxaca',
                'website' => 'https://www.tlaxiaco.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico Superior de San Miguel el Grande',
                'description' => 'Tecnológico descentralizado en la Mixteca Alta de Oaxaca.',
                'location' => 'San Miguel el Grande, Tlaxiaco, Oaxaca',
                'website' => 'https://www.sanmiguel.tecnm.mx',
            ],
            [
                'name' => 'Instituto Tecnológico Superior de Teposcolula',
                'description' => 'Tecnológico descentralizado enfocado en desarrollo comunitario, gastronomía e ingeniería en Oaxaca.',
                'location' => 'San Pedro y San Pablo Teposcolula, Oaxaca',
                'website' => 'https://www.teposcolula.tecnm.mx',
            ],
            [
                'name' => 'CIIDIR Unidad Oaxaca - IPN',
                'description' => 'Centro de investigación enfocado en el desarrollo regional y sustentabilidad.',
                'sector' => 'Tecnología e innovación',
                'email' => 'ciidir_oaxaca@ipn.mx',
                'phone' => '9515170610',
                'location' => 'Hornus 100, Noche Buena, Santa Cruz Xoxocotlán, Oaxaca',
                'website' => 'https://www.ciidiroaxaca.ipn.mx',
            ],
            [
                'name' => 'Universidad Autónoma "Benito Juárez" de Oaxaca (UABJO)',
                'description' => 'Universidad pública estatal de Oaxaca con facultades de ciencias, ingenierías, humanidades y salud.',
                'location' => 'Av. Universidad s/n, Cinco Señores, Oaxaca de Juárez, Oaxaca',
                'website' => 'https://www.uabjo.mx',
            ],
            [
                'name' => 'Universidad Tecnológica de la Mixteca (UTM)',
                'description' => 'Universidad pública del SUNEO reconocida por su investigación e ingeniería en la Mixteca.',
                'location' => 'Carretera a Acatlima km 2.5, Heroica Ciudad de Huajuapan de León, Oaxaca',
                'website' => 'https://www.utm.mx',
            ],
            [
                'name' => 'Universidad del Mar (UMAR)',
                'description' => 'Universidad pública del SUNEO con campus en Puerto Ángel, Huatulco y Puerto Escondido.',
                'location' => 'Ciudad Universitaria, Puerto Ángel, San Pedro Pochutla, Oaxaca',
                'website' => 'https://www.umar.mx',
            ],
            [
                'name' => 'Universidad del Istmo (UNISTMO)',
                'description' => 'Universidad pública del SUNEO en Santo Domingo Tehuantepec, Ixtepec y Juchitán.',
                'location' => 'Ciudad Universitaria s/n, Santo Domingo Tehuantepec, Oaxaca',
                'website' => 'https://www.unistmo.edu.mx',
            ],
            [
                'name' => 'Universidad de la Sierra Sur (UNSIS)',
                'description' => 'Universidad pública del SUNEO orientada a salud, informática y administración municipal.',
                'location' => 'Guillermo Rojas Mijangos s/n, Miahuatlán de Porfirio Díaz, Oaxaca',
                'website' => 'https://www.unsis.edu.mx',
            ],
            [
                'name' => 'Universidad de la Sierra Juárez (UNSIJ)',
                'description' => 'Universidad pública del SUNEO especializada en ciencias forestales, ambientales e informática.',
                'location' => 'Av. Universidad s/n, Ixtlán de Juárez, Oaxaca',
                'website' => 'https://www.unsij.edu.mx',
            ],
            [
                'name' => 'Universidad del Papaloapan (UNPA)',
                'description' => 'Universidad pública del SUNEO en Tuxtepec y Loma Bonita.',
                'location' => 'Circuito Central 200, San Juan Bautista Tuxtepec, Oaxaca',
                'website' => 'https://www.unpa.edu.mx',
            ],
            [
                'name' => 'Universidad de la Cañada (UNCA)',
                'description' => 'Universidad pública del SUNEO orientada a agroindustria, farmacobiología e informática.',
                'location' => 'Carretera Teotitlán-San Antonio Nanahuatipan km 1.7, Teotitlán de Flores Magón, Oaxaca',
                'website' => 'https://www.unca.edu.mx',
            ],
            [
                'name' => 'Universidad de la Costa (UNCOS)',
                'description' => 'Universidad pública del SUNEO en Santiago Pinotepa Nacional.',
                'location' => 'Libramiento s/n, Santiago Pinotepa Nacional, Oaxaca',
                'website' => 'https://www.uncos.edu.mx',
            ],
            [
                'name' => 'Universidad Politécnica de Oaxaca (UPO)',
                'description' => 'Universidad pública enfocada en competencias profesionales, ingeniería y negocios en Valles Centrales.',
                'location' => 'San Bartolo Coyotepec, Oaxaca',
                'website' => 'https://www.upo.edu.mx',
            ],
            [
                'name' => 'Universidad Tecnológica de los Valles Centrales de Oaxaca (UTVCO)',
                'description' => 'Institución tecnológica superior enfocada en energías renovables, agroindustria, mecatrónica y TIC.',
                'location' => 'Av. Universidad s/n, San Pablo Huixtepec, Oaxaca',
                'website' => 'https://www.utvco.edu.mx',
            ],
            [
                'name' => 'Universidad Autónoma Comunal de Oaxaca (UACO)',
                'description' => 'Universidad pública estatal intercultural y comunal con centros universitarios en regiones de Oaxaca.',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'website' => 'https://uaco.edu.mx',
            ],
            [
                'name' => 'UNAM - Sede Oaxaca',
                'description' => 'Sede de investigación, extensión universitaria y educación continua de la UNAM en Oaxaca.',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'website' => 'https://www.unam.mx',
            ],
            [
                'name' => 'CIESAS Pacífico Sur',
                'description' => 'Centro público de investigación en antropología social, historia y estudios regionales en Oaxaca.',
                'location' => 'Calle Dr. Federico Ortiz Armengol 201, Reforma, Oaxaca de Juárez, Oaxaca',
                'website' => 'https://pacificosur.ciesas.edu.mx',
            ],
            [
                'name' => 'Universidad Anáhuac Oaxaca',
                'description' => 'Universidad privada en Oaxaca orientada a formación profesional, innovación y emprendimiento.',
                'location' => 'Blvd. Guadalupe Hinojosa de Murat 1100, San Raymundo Jalpan, Oaxaca',
                'website' => 'https://www.anahuac.mx/oaxaca',
            ],
            [
                'name' => 'Universidad Regional del Sureste (URSE)',
                'description' => 'Institución privada de educación superior en Oaxaca con programas de arquitectura, derecho, salud y administración.',
                'location' => 'Libramiento Sur 100, El Rosario, San Sebastián Tutla, Oaxaca',
                'website' => 'https://www.urse.edu.mx',
            ],
            [
                'name' => 'Universidad La Salle Oaxaca',
                'description' => 'Universidad privada enfocada en educación integral, ingeniería, diseño y desarrollo social.',
                'location' => 'Camino a San Agustín 407, Santa Cruz Xoxocotlán, Oaxaca',
                'website' => 'https://www.ulsaoaxaca.edu.mx',
            ],
            [
                'name' => 'Universidad José Vasconcelos de Oaxaca (UNIVAS)',
                'description' => 'Institución privada de educación superior en Oaxaca de Juárez.',
                'location' => 'Calle Crespo 601, Centro, Oaxaca de Juárez, Oaxaca',
                'website' => 'https://www.univas.edu.mx',
            ],
            [
                'name' => 'Universidad Mesoamericana Oaxaca',
                'description' => 'Institución privada de educación superior en los Valles Centrales de Oaxaca.',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'website' => 'https://www.mesoamericana.edu.mx',
            ],
            [
                'name' => 'Escuela Normal Superior Federal de Oaxaca (ENSFO)',
                'description' => 'Institución formadora de docentes de educación media y secundaria en Oaxaca.',
                'location' => 'Oaxaca de Juárez, Oaxaca',
            ],
            [
                'name' => 'Centro Regional de Educación Normal de Oaxaca (CRENO)',
                'description' => 'Institución pública formadora de docentes en el estado de Oaxaca.',
                'location' => 'Calz. San Felipe del Agua s/n, Oaxaca de Juárez, Oaxaca',
            ],
        ];

        $otherOrganizations = [
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

        foreach ($verifiedInstitutions as $institution) {
            Organization::updateOrCreate(
                ['name' => $institution['name']],
                [
                    'organization_type' => 'institucion_educativa',
                    'sector' => $institution['sector'] ?? 'Educación y capacitación',
                    'description' => $institution['description'],
                    'location' => $institution['location'] ?? null,
                    'email' => $institution['email'] ?? null,
                    'phone' => $institution['phone'] ?? null,
                    'website' => $institution['website'] ?? null,
                    'approval_status' => 'approved',
                    'rejection_reason' => null,
                ]
            );
        }

        foreach ($otherOrganizations as $org) {
            Organization::updateOrCreate(
                ['name' => $org['name']],
                $org + ['approval_status' => 'approved']
            );
        }
    }
}
