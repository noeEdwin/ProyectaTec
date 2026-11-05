<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('profiles', 'affiliation_history')) {
            Schema::table('profiles', fn (Blueprint $table) => $table->json('affiliation_history')->nullable());
        }
        if (! Schema::hasColumn('profiles', 'affiliation_rejection_reason')) {
            Schema::table('profiles', fn (Blueprint $table) => $table->text('affiliation_rejection_reason')->nullable());
        }
        if (! Schema::hasColumn('organizations', 'legal_name')) {
            Schema::table('organizations', fn (Blueprint $table) => $table->string('legal_name')->nullable());
        }
        if (! Schema::hasColumn('organizations', 'website')) {
            Schema::table('organizations', fn (Blueprint $table) => $table->string('website')->nullable());
        }
    }

    public function down(): void
    {
        Schema::table('organizations', function (Blueprint $table) {
            $table->dropColumn(['legal_name', 'website']);
        });

        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['affiliation_history', 'affiliation_rejection_reason']);
        });
    }
};
