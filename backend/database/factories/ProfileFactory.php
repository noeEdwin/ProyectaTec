<?php

namespace Database\Factories;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Profile>
 */
class ProfileFactory extends Factory
{
    protected $model = Profile::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'display_name' => fake()->name(),
            'description' => fake()->sentence(),
            'phone' => fake()->numerify('##########'),
            'location' => fake()->city() . ', ' . fake()->state(),
            'avatar_path' => null,
            'institution' => fake()->company(),
            'field_of_study' => fake()->randomElement([
                'Ingeniería en sistemas',
                'Ciencias ambientales',
                'Administración',
                'Diseño',
                'Educación',
            ]),
        ];
    }
}