<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organization_members', function (Blueprint $table) {
            if (! Schema::hasColumn('organization_members', 'requested_role')) {
                $table->string('requested_role')->nullable()->after('role');
            }
            if (! Schema::hasColumn('organization_members', 'request_note')) {
                $table->text('request_note')->nullable()->after('requested_role');
            }
            if (! Schema::hasColumn('organization_members', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('request_note');
            }
        });
    }

    public function down(): void
    {
        Schema::table('organization_members', function (Blueprint $table) {
            $columns = array_values(array_filter(
                ['requested_role', 'request_note', 'rejection_reason'],
                fn (string $column): bool => Schema::hasColumn('organization_members', $column)
            ));
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
