<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PlayerAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create or retrieve Coach
        $coachEmail = 'coach.attendance@example.com';
        $coach = DB::table('users')->where('email', $coachEmail)->first();
        if (!$coach) {
            $coachId = Str::uuid()->toString();
            DB::table('users')->insert([
                'id' => $coachId,
                'email' => $coachEmail,
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Trener',
                'last_name' => 'Testowy',
                'role' => 'coach',
                'avatar_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=coach_test',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $coach = DB::table('users')->where('id', $coachId)->first();
        }

        $team = DB::table('teams')->where('name', 'FC Attendance Test')->first();
        if (!$team) {
            $teamId = Str::uuid()->toString();
            DB::table('teams')->insert([
                'id' => $teamId,
                'name' => 'FC Attendance Test',
                'description' => 'Drużyna do testowania obecności na wydarzeniach.',
                'created_at' => now(),
            ]);
            
            DB::table('team_coaches')->insert([
                'id' => Str::uuid()->toString(),
                'team_id' => $teamId,
                'user_id' => $coach->id,
                'role' => 'Główny trener',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            $team = DB::table('teams')->where('id', $teamId)->first();
        }

        // 3. Create or retrieve Player
        $playerEmail = 'player.attendance@example.com';
        $player = DB::table('users')->where('email', $playerEmail)->first();
        if (!$player) {
            $playerId = Str::uuid()->toString();
            DB::table('users')->insert([
                'id' => $playerId,
                'email' => $playerEmail,
                'password_hash' => Hash::make('password123'),
                'first_name' => 'Jan',
                'last_name' => 'Będący',
                'role' => 'player',
                'avatar_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=player_test',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $player = DB::table('users')->where('id', $playerId)->first();

            // Assign Player to Team
            DB::table('team_members')->insert([
                'id' => Str::uuid()->toString(),
                'team_id' => $team->id,
                'user_id' => $player->id,
                'status' => 'approved',
                'joined_at' => now(),
            ]);
        }

        // 4. Create an upcoming training session
        $trainingId = Str::uuid()->toString();
        DB::table('training_sessions')->insert([
            'id' => $trainingId,
            'team_id' => $team->id,
            'created_by' => $coach->id,
            'event_type' => 'training',
            'title' => 'Przykładowy trening z obecnością',
            'description' => 'Dynamiczny trening techniczny mający na celu przetestowanie panelu deklaracji obecności.',
            'scheduled_at' => now()->addDays(3),
            'duration_minutes' => 90,
            'created_at' => now(),
        ]);

        // 5. Create a pre-seeded attendance record (declared as present)
        DB::table('attendance')->insert([
            'id' => Str::uuid()->toString(),
            'training_id' => $trainingId,
            'user_id' => $player->id,
            'status' => 'obecny',
            'responded_at' => now(),
            'note' => 'Będę na 100% z nowym sprzętem treningowym!',
        ]);

        // 6. Create another event (Match) without attendance pre-declared
        $matchId = Str::uuid()->toString();
        DB::table('training_sessions')->insert([
            'id' => $matchId,
            'team_id' => $team->id,
            'created_by' => $coach->id,
            'event_type' => 'match',
            'title' => 'Mecz z FC Seeder',
            'description' => 'Mecz kontrolny mający na celu sprawdzenie formy przed ligą.',
            'scheduled_at' => now()->addDays(6),
            'duration_minutes' => 90,
            'created_at' => now(),
        ]);
    }
}
