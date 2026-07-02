<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create team_coaches table
        Schema::create('team_coaches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('team_id');
            $table->uuid('user_id');
            $table->string('role')->default('Główny trener'); // e.g. Główny trener, Asystent, Trener bramkarzy
            $table->timestamps();

            $table->foreign('team_id')->references('id')->on('teams')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['team_id', 'user_id']);
        });

        // 2. Transfer existing coaches from teams table to team_coaches
        $teams = DB::table('teams')->get();
        foreach ($teams as $team) {
            if (!empty($team->coach_id)) {
                DB::table('team_coaches')->insert([
                    'id' => (string) Illuminate\Support\Str::uuid(),
                    'team_id' => $team->id,
                    'user_id' => $team->coach_id,
                    'role' => 'Główny trener',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 3. Drop foreign key and column coach_id from teams table
        Schema::table('teams', function (Blueprint $table) {
            $table->dropForeign(['coach_id']);
            $table->dropColumn('coach_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Add coach_id column back to teams table
        Schema::table('teams', function (Blueprint $table) {
            $table->uuid('coach_id')->nullable();
            $table->foreign('coach_id')->references('id')->on('users')->onDelete('cascade');
        });

        // 2. Transfer data back from team_coaches to teams table
        $coaches = DB::table('team_coaches')->orderByRaw("CASE WHEN role = 'Główny trener' THEN 0 ELSE 1 END")->get();
        $processedTeams = [];
        foreach ($coaches as $coach) {
            if (!in_array($coach->team_id, $processedTeams)) {
                DB::table('teams')->where('id', $coach->team_id)->update([
                    'coach_id' => $coach->user_id,
                ]);
                $processedTeams[] = $coach->team_id;
            }
        }

        // 3. Drop team_coaches table
        Schema::dropIfExists('team_coaches');
    }
};
