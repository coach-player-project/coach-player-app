<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->integer('api_football_team_id')->nullable();
            $table->integer('api_football_league_id')->nullable();
            $table->integer('api_football_season')->nullable();
            $table->string('api_football_team_name')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn([
                'api_football_team_id',
                'api_football_league_id',
                'api_football_season',
                'api_football_team_name',
            ]);
        });
    }
};
