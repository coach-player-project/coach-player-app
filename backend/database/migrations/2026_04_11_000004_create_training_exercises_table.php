<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('training_exercises', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('training_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('canvas_schema')->nullable();
            $table->integer('order_index');
            $table->integer('tools_count')->default(0);

            $table->foreign('training_id')->references('id')->on('training_sessions')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('training_exercises');
    }
};
