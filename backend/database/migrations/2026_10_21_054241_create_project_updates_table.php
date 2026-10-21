
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_updates', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                ->constrained('projects')
                ->cascadeOnDelete();

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('title');
            $table->text('description');
            $table->integer('progress')->nullable();

            $table->timestamps();
        });

        DB::statement(
            'ALTER TABLE project_updates
             ADD CONSTRAINT project_updates_progress_range
             CHECK (progress IS NULL OR (progress >= 0 AND progress <= 100))'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('project_updates');
    }
};
