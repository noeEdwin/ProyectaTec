<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->string('support_type', 120)->nullable()->after('message');
            $table->string('availability', 255)->nullable()->after('support_type');
            $table->text('expectations')->nullable()->after('availability');
            $table->string('portfolio_url', 500)->nullable()->after('expectations');
            $table->string('github_url', 500)->nullable()->after('portfolio_url');
            $table->string('linkedin_url', 500)->nullable()->after('github_url');
            $table->string('cv_path', 500)->nullable()->after('linkedin_url');
            $table->string('cv_original_name', 255)->nullable()->after('cv_path');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn([
                'support_type',
                'availability',
                'expectations',
                'portfolio_url',
                'github_url',
                'linkedin_url',
                'cv_path',
                'cv_original_name',
            ]);
        });
    }
};
