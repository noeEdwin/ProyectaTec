<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\OrganizationMember;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoAccountsSeeder extends Seeder
{
    public const DEMO_PASSWORD = 'ProyectaTecDemo2026!';

    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            OrganizationSeeder::class,
        ]);

        $ito = Organization::where('name', 'Instituto Tecnológico de Oaxaca')->first();

        $demoLab = Organization::updateOrCreate(
            ['name' => 'Laboratorio Demo Oaxaca'],
            [
                'organization_type' => 'empresa',
                'description' => 'Organización de demostración para probar publicaciones y permisos de administración.',
                'sector' => 'Tecnología e innovación',
                'email' => 'laboratorio.demo@proyectatec.test',
                'phone' => '9510000001',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'public_fields' => ['location', 'classification'],
                'approval_status' => 'approved',
                'rejection_reason' => null,
            ]
        );

        $passwordHash = Hash::make(self::DEMO_PASSWORD);

        $admin = $this->upsertUser(
            'admin.demo@proyectatec.test',
            'Administración ProyectaTec',
            'academico',
            $passwordHash,
            [
                'display_name' => 'Administración ProyectaTec',
                'description' => 'Cuenta de demostración con acceso al panel de moderación.',
                'phone' => '9510000002',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'institution' => 'ProyectaTec',
                'field_of_study' => 'Moderación de plataforma',
                'academic_role' => 'docente',
                'public_fields' => ['location', 'institution'],
            ]
        );

        $this->upsertUser(
            'estudiante.demo@proyectatec.test',
            'Mariana López',
            'estudiante',
            $passwordHash,
            [
                'display_name' => 'Mariana López',
                'description' => 'Estudiante de Ingeniería en Sistemas interesada en tecnología cívica y desarrollo comunitario.',
                'phone' => '9510000000',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'institution' => $ito?->name ?? 'Instituto Tecnológico de Oaxaca',
                'field_of_study' => 'Ingeniería en Sistemas Computacionales',
                'campus' => 'Oaxaca',
                'semester' => '6',
                'student_number' => '23160001',
                'expected_graduation' => '2027-06',
                'academic_role' => 'investigador',
                'locality' => 'Oaxaca de Juárez, Oaxaca',
                'interest_areas' => ['Tecnología e innovación', 'Desarrollo comunitario'],
                'public_fields' => ['location', 'institution', 'field_of_study', 'interest_areas'],
            ]
        );

        $this->upsertUser(
            'docente.demo@proyectatec.test',
            'Carlos Hernández',
            'academico',
            $passwordHash,
            [
                'display_name' => 'Carlos Hernández',
                'description' => 'Docente y asesor de proyectos de innovación aplicada y energías renovables.',
                'phone' => '9510000000',
                'location' => 'Santa Cruz Xoxocotlán, Oaxaca',
                'institution' => $ito?->name ?? 'Instituto Tecnológico de Oaxaca',
                'field_of_study' => 'Ingeniería eléctrica',
                'academic_role' => 'docente',
                'interest_areas' => ['Energías renovables', 'Investigación'],
                'public_fields' => ['location', 'institution', 'field_of_study', 'interest_areas'],
            ]
        );

        $this->upsertUser(
            'comunidad.demo@proyectatec.test',
            'Rosa Martínez',
            'residente_oaxaca',
            $passwordHash,
            [
                'display_name' => 'Rosa Martínez',
                'description' => 'Representante comunitaria que impulsa iniciativas de agua y agricultura sustentable.',
                'phone' => '9510000000',
                'location' => 'San Pedro Pochutla, Oaxaca',
                'municipality' => 'San Pedro Pochutla',
                'locality' => 'Centro',
                'interest_areas' => ['Agua', 'Agricultura sustentable'],
                'public_fields' => ['location', 'interest_areas'],
            ]
        );

        $orgOwner = $this->upsertUser(
            'organizacion.demo@proyectatec.test',
            'Laboratorio Demo Oaxaca',
            'organizacion',
            $passwordHash,
            [
                'display_name' => 'Laboratorio Demo Oaxaca',
                'description' => 'Cuenta de organización para publicar proyectos y revisar postulaciones.',
                'phone' => '9510000001',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'organization_id' => $demoLab->id,
                'organization_name' => $demoLab->name,
                'organization_area' => 'Dirección de vinculación',
                'organization_position' => 'Responsable',
                'public_fields' => ['location', 'organization_name'],
            ]
        );

        $empleado = $this->upsertUser(
            'empleado.demo@proyectatec.test',
            'Carlos Empleado',
            'empleado_organizacion',
            $passwordHash,
            [
                'display_name' => 'Carlos Empleado',
                'description' => 'Integrante de equipo técnico vinculado a Laboratorio Demo Oaxaca.',
                'phone' => '9510000003',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'organization_id' => $demoLab->id,
                'organization_name' => $demoLab->name,
                'organization_area' => 'Desarrollo de software',
                'organization_position' => 'Colaborador técnico',
                'public_fields' => ['location', 'organization_name'],
            ]
        );

        $itoOwner = $this->upsertUser(
            'ito.demo@proyectatec.test',
            'Representante ITO',
            'organizacion',
            $passwordHash,
            [
                'display_name' => 'Representante ITO',
                'description' => 'Enlace institucional del Instituto Tecnológico de Oaxaca.',
                'phone' => '9511234567',
                'location' => 'Oaxaca de Juárez, Oaxaca',
                'institution' => $ito?->name ?? 'Instituto Tecnológico de Oaxaca',
                'organization_id' => $ito?->id,
                'organization_name' => $ito?->name ?? 'Instituto Tecnológico de Oaxaca',
                'organization_area' => 'Gestión Tecnológica y Vinculación',
                'organization_position' => 'Coordinador institucional',
                'public_fields' => ['location', 'institution', 'organization_name'],
            ]
        );

        OrganizationMember::updateOrCreate(
            ['organization_id' => $demoLab->id, 'user_id' => $orgOwner->id],
            ['role' => 'admin', 'status' => 'active', 'joined_at' => now()]
        );

        OrganizationMember::updateOrCreate(
            ['organization_id' => $demoLab->id, 'user_id' => $empleado->id],
            ['role' => 'member', 'status' => 'active', 'joined_at' => now()]
        );

        if ($ito) {
            OrganizationMember::updateOrCreate(
                ['organization_id' => $ito->id, 'user_id' => $itoOwner->id],
                ['role' => 'admin', 'status' => 'active', 'joined_at' => now()]
            );
        }

        // Evitar variable sin uso
        unset($admin);
    }

    /** @param array<string, mixed> $profileAttributes */
    private function upsertUser(
        string $email,
        string $name,
        string $accountType,
        string $passwordHash,
        array $profileAttributes
    ): User {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => $passwordHash,
                'account_type' => $accountType,
                'is_active' => true,
            ]
        );

        Profile::updateOrCreate(
            ['user_id' => $user->id],
            $profileAttributes + ['affiliation_status' => 'current']
        );

        return $user;
    }
}
