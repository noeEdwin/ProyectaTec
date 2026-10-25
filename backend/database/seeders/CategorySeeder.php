<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Tecnología',
            'Educación',
            'Medio ambiente',
            'Salud',
            'Innovación social',
            'Investigación',
            'Emprendimiento',
            'Cultura y arte',
            'Desarrollo comunitario',
            'Ciencia',
        ];

        foreach ($categories as $name) {
            Category::firstOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'description' => 'Categoría de proyectos y necesidades comunitarias.',
                ]
            );
        }
    }
}
