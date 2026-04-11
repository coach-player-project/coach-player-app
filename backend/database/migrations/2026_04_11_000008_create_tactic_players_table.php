<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tactic_players', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tactic_id');
            $table->uuid('user_id');
            $table->float('position_x');
            $table->float('position_y');
            $table->string('role')->nullable();
            $table->text('notes')->nullable();

            $table->foreign('tactic_id')->references('id')->on('tactics')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tactic_players');
    }
};
