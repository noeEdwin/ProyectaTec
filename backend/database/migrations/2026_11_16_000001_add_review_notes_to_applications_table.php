<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('applications', 'review_notes')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->text('review_notes')->nullable()->after('reviewed_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('applications', 'review_notes')) {
            Schema::table('applications', function (Blueprint $table) {
                $table->dropColumn('review_notes');
            });
        }
    }
};
