<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->boolean('is_hidden')->default(false);
        });

        Schema::table('community_needs', function (Blueprint $table) {
            $table->boolean('is_hidden')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('community_needs', function (Blueprint $table) {
            $table->dropColumn('is_hidden');
        });

        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('is_hidden');
        });
    }
};