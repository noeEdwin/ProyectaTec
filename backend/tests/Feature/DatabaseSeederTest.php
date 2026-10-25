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
