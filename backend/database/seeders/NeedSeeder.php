<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\CommunityNeed;
use App\Models\Project;
use App\Models\ProjectNeed;
use App\Models\User;
use Illuminate\Database\Seeder;

class NeedSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Necesidades específicas de Proyectos (8 items)
        $projectNeeds = [
            [
                'project' => 'Plataforma de Manejo de Agua',
                'title' => 'Desarrollador Frontend (React)',
                'description' => 'Buscamos un estudiante con conocimientos en React y TypeScript para construir la interfaz.',
                'required_profile' => 'Frontend Developer',
                'openings' => 2,
                'status' => 'open',
            ],
            [
                'project' => 'Sistema de Gestión de Residuos',
                'title' => 'Diseñador UI/UX (Figma)',
                'description' => 'Se requiere apoyo para diseñar los prototipos y pantallas de la aplicación móvil en Figma.',
                'required_profile' => 'UI/UX Designer',
                'openings' => 1,
                'status' => 'open',
            ],
            [
                'project' => 'Portal de Vinculación Universitaria',
                'title' => 'Desarrollador Backend (Laravel)',
                'description' => 'Necesitamos apoyo en la creación de la API y manejo de PostgreSQL.',
                'required_profile' => 'Backend Developer',
                'openings' => 1,
                'status' => 'open',
            ],
            [
                'project' => 'Monitor Agrícola del Valle de Zimatlán',
                'title' => 'Especialista en IoT y Sensores',
                'description' => 'Integración de placas Arduino/ESP32 para lectura remota de humedad.',
                'required_profile' => 'Embedded Systems / IoT Engineer',
                'openings' => 2,
                'status' => 'open',
            ],
            [
                'project' => 'App de Expediente Médico Rural',
                'title' => 'Desarrollador Mobile (Flutter)',
                'description' => 'Desarrollo de pantallas móviles con sincronización SQLite para almacenamiento offline.',
                'required_profile' => 'Mobile Developer',
                'openings' => 1,
                'status' => 'open',
            ],
            [
                'project' => 'Archivo Digital Zapoteco',
                'title' => 'Digitalizador y Editor de Audio',
                'description' => 'Limpieza de grabaciones de voz y catalogación de archivos sonoros históricos.',
                'required_profile' => 'Audio Engineer / Content Manager',
                'openings' => 3,
                'status' => 'open',
            ],
            [
                'project' => 'Catálogo de Flora y Fauna Oaxaqueña',
                'title' => 'Analista de Datos y Clasificación',
                'description' => 'Estructuración de registros taxonómicos y pruebas de etiquetado automático.',
                'required_profile' => 'Data Analyst',
                'openings' => 1,
                'status' => 'open',
            ],
            [
                'project' => 'Dashboard de Métricas e Innovación',
                'title' => 'QA Tester y Control de Calidad',
                'description' => 'Pruebas funcionales, de rendimiento y elaboración de reportes de bugs.',
                'required_profile' => 'QA Specialist',
                'openings' => 1,
                'status' => 'closed',
            ],
        ];

        foreach ($projectNeeds as $need) {
            $project = Project::where('title', $need['project'])->firstOrFail();
            unset($need['project']);

            ProjectNeed::updateOrCreate(
                ['project_id' => $project->id, 'title' => $need['title']],
                $need
            );
        }

        // 2. Necesidades Comunitarias (8 items)
        $communityNeeds = [
            [
                'category' => 'medio-ambiente',
                'title' => 'Mantenimiento de áreas verdes y reforestación',
                'description' => 'El parque requiere limpieza general, poda y plantación de nuevos árboles nativos.',
                'location' => 'Parque El Llano, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'tecnologia',
                'title' => 'Mejora de red local comunitaria',
                'description' => 'Se necesita apoyo para configurar routers y mejorar la conexión a internet en el centro comunitario.',
                'location' => 'San Martín Mexicapam, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'educacion',
                'title' => 'Taller de Alfabetización Digital para Adultos Mayores',
                'description' => 'Capacitación básica en uso de smartphones, trámites en línea y prevención de fraudes.',
                'location' => 'Biblioteca Pública Central, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'medio-ambiente',
                'title' => 'Instalación de Sistemas de Captación de Lluvia',
                'description' => 'Asesoría técnica para construir e instalar tanques colectores caseros.',
                'location' => 'Colonia Lomas de San Jacinto, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'cultura-y-arte',
                'title' => 'Creación de Sitio Web para Artesanos Locales',
                'description' => 'Desarrollo de un catálogo web para difundir textiles tradicionales sin intermediarios.',
                'location' => 'Santo Tomás Jalieza, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'tecnologia',
                'title' => 'Asesoría en Mantenimiento de Equipos de Cómputo Escolar',
                'description' => 'Formateo, instalación de antivirus y limpieza física de 20 computadoras de primaria.',
                'location' => 'Santa María Atzompa, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'medio-ambiente',
                'title' => 'Taller de Compostaje Urbano',
                'description' => 'Aprender a procesar residuos orgánicos en el hogar para reducir la basura enviada al vertedero.',
                'location' => 'Agencia de Candiani, Oaxaca',
                'status' => 'open',
            ],
            [
                'category' => 'educacion',
                'title' => 'Regularización de Matemáticas y Lógica',
                'description' => 'Asesorías gratuitas los fines de semana para estudiantes de secundaria de la zona.',
                'location' => 'Santa Cruz Xoxocotlán, Oaxaca',
                'status' => 'open',
            ],
        ];

        $user = User::where('email', 'test@example.com')->firstOrFail();

        foreach ($communityNeeds as $communityNeed) {
            $category = Category::where('slug', $communityNeed['category'])->firstOrFail();
            unset($communityNeed['category']);

            CommunityNeed::updateOrCreate(
                ['created_by' => $user->id, 'title' => $communityNeed['title']],
                [...$communityNeed, 'category_id' => $category->id]
            );
        }
    }
}
