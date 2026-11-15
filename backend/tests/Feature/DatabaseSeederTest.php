<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeders_can_run_repeatedly_without_duplicates(): void
    {
        Artisan::call('db:seed', ['--force' => true]);
        $firstRunCounts = $this->seededTableCounts();

        Artisan::call('db:seed', ['--force' => true]);

        $this->assertSame($firstRunCounts, $this->seededTableCounts());
    }

    public function test_demo_accounts_seeder_is_idempotent(): void
    {
        Artisan::call('db:seed', ['--class' => 'DemoAccountsSeeder', '--force' => true]);
        $firstRunCounts = $this->seededTableCounts();

        Artisan::call('db:seed', ['--class' => 'DemoAccountsSeeder', '--force' => true]);

        $this->assertSame($firstRunCounts, $this->seededTableCounts());
        $this->assertDatabaseHas('users', ['email' => 'admin.demo@proyectatec.test']);
        $this->assertDatabaseHas('users', ['email' => 'ito.demo@proyectatec.test']);
        $this->assertDatabaseHas('users', ['email' => 'empleado.demo@proyectatec.test']);
    }

    /** @return array<string, int> */
    private function seededTableCounts(): array
    {
        $tables = [
            'users',
            'profiles',
            'organizations',
            'organization_members',
            'categories',
            'projects',
            'project_needs',
            'community_needs',
            'applications',
            'project_members',
            'project_updates',
            'project_files',
            'project_comments',
            'notifications',
        ];

        return collect($tables)
            ->mapWithKeys(fn (string $table): array => [$table => DB::table($table)->count()])
            ->all();
    }
}
