<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->nullOnDelete();
            $table->string('campus')->nullable();
            $table->string('semester')->nullable();
            $table->string('student_number')->nullable();
            $table->string('expected_graduation')->nullable();
            $table->string('academic_role')->nullable();
            $table->string('organization_name')->nullable();
            $table->string('organization_area')->nullable();
            $table->string('organization_position')->nullable();
            $table->string('municipality')->nullable();
            $table->string('locality')->nullable();
            $table->json('public_fields')->nullable();
            $table->json('pending_affiliation')->nullable();
            $table->string('affiliation_status')->default('current');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('organization_id');
            $table->dropColumn([
                'campus',
                'semester',
                'student_number',
                'expected_graduation',
                'academic_role',
                'organization_name',
                'organization_area',
                'organization_position',
                'municipality',
                'locality',
                'public_fields',
                'pending_affiliation',
                'affiliation_status',
            ]);
        });
    }
};
