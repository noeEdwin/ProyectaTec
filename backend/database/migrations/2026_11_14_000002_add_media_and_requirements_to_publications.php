<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('cover_image_path')->nullable()->after('ends_at');
            $table->json('gallery_paths')->nullable()->after('cover_image_path');
        });

        Schema::table('community_needs', function (Blueprint $table) {
            $table->string('cover_image_path')->nullable()->after('status');
            $table->json('gallery_paths')->nullable()->after('cover_image_path');
            $table->json('requirements')->nullable()->after('gallery_paths');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['cover_image_path', 'gallery_paths']);
        });

        Schema::table('community_needs', function (Blueprint $table) {
            $table->dropColumn(['cover_image_path', 'gallery_paths', 'requirements']);
        });
    }
};
