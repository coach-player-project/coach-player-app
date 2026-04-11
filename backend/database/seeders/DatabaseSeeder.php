<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Coach
        $coachId = Str::uuid()->toString();
        DB::table('users')->insert([
            'id' => $coachId,
            'email' => 'coach@example.com',
            'password_hash' => Hash::make('password123'),
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'role' => 'coach',
            'avatar_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=coach',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create Players
        $playerIds = [];
        for ($i = 1; $i <= 11; $i++) {
            $playerId = Str::uuid()->toString();
            $playerIds[] = $playerId;
            
            DB::table('users')->insert([
                'id' => $playerId,
                'email' => "player{$i}@example.com",
                'password_hash' => Hash::make('password123'),
                'first_name' => "Zawodnik",
                'last_name' => "Numer {$i}",
                'role' => 'player',
                'avatar_url' => "https://api.dicebear.com/7.x/avataaars/svg?seed=player{$i}",
                'created_at' => now()->subDays(rand(1, 10)),
                'updated_at' => now(),
            ]);
        }

        // 3. Create Team
        $teamId = Str::uuid()->toString();
        DB::table('teams')->insert([
            'id' => $teamId,
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Najlepszy wirtualny klub piłkarski w aplikacji.',
            'coach_id' => $coachId,
            'created_at' => now()->subDays(30),
        ]);

        // 4. Assign Players to Team
        foreach ($playerIds as $playerId) {
            DB::table('team_members')->insert([
                'id' => Str::uuid()->toString(),
                'team_id' => $teamId,
                'user_id' => $playerId,
                'joined_at' => now()->subDays(rand(1, 25)),
            ]);
        }

        // 5. Create Training Session
        $trainingId = Str::uuid()->toString();
        DB::table('training_sessions')->insert([
            'id' => $trainingId,
            'team_id' => $teamId,
            'created_by' => $coachId,
            'title' => 'Trening wydajnościowy',
            'description' => 'Skupiamy się na motoryce i kondycji po przerwie.',
            'scheduled_at' => now()->addDays(2),
            'duration_minutes' => 90,
            'canvas_data' => null,
            'google_event_id' => null,
            'created_at' => now()->subDays(1),
        ]);

        // 6. Create Training Exercises
        $exercises = [
            ['name' => 'Rozgrzewka', 'description' => 'Bieganie dookoła boiska, rozciąganie'],
            ['name' => 'Dziadek', 'description' => 'Gra na utrzymanie 5 na 2'],
            ['name' => 'Gierka', 'description' => 'Mecz kontrolny 5 na 5 na skróconym boisku'],
        ];

        foreach ($exercises as $index => $ex) {
            DB::table('training_exercises')->insert([
                'id' => Str::uuid()->toString(),
                'training_id' => $trainingId,
                'name' => $ex['name'],
                'description' => $ex['description'],
                'canvas_schema' => null,
                'order_index' => $index + 1,
                'tools_count' => rand(0, 5),
            ]);
        }

        // 7. Create past training for Attendance and Fatigue ratings
        $pastTrainingId = Str::uuid()->toString();
        DB::table('training_sessions')->insert([
            'id' => $pastTrainingId,
            'team_id' => $teamId,
            'created_by' => $coachId,
            'title' => 'Trening taktyczny',
            'description' => 'Omawiamy nowe zagrywki.',
            'scheduled_at' => now()->subDays(2),
            'duration_minutes' => 120,
            'canvas_data' => null,
            'google_event_id' => null,
            'created_at' => now()->subDays(5),
        ]);

        // 8. Add Attendance & Fatigue Ratings for past training
        foreach ($playerIds as $index => $playerId) {
            $attended = rand(0, 100) > 20; // 80% chance of attendance
            
            DB::table('attendance')->insert([
                'id' => Str::uuid()->toString(),
                'training_id' => $pastTrainingId,
                'user_id' => $playerId,
                'status' => $attended ? 'obecny' : 'nieobecny',
                'responded_at' => now()->subDays(3),
                'note' => $attended ? null : 'Zwolnienie lekarskie',
            ]);

            if ($attended) {
                DB::table('fatigue_ratings')->insert([
                    'id' => Str::uuid()->toString(),
                    'training_id' => $pastTrainingId,
                    'user_id' => $playerId,
                    'rating' => rand(3, 10),
                    'submitted_at' => now()->subDays(1),
                ]);
            }
        }

        // 9. Tactics
        $tacticId = Str::uuid()->toString();
        DB::table('tactics')->insert([
            'id' => $tacticId,
            'team_id' => $teamId,
            'created_by' => $coachId,
            'title' => 'Ofensywne 4-3-3',
            'description' => 'Taktyka na słabszego przeciwnika - wysoki pressing.',
            'canvas_data' => null,
            'formation' => '4-3-3',
            'match_date' => now()->addDays(5),
            'created_at' => now(),
        ]);

        // 10. Tactic Players
        foreach (array_slice($playerIds, 0, 11) as $index => $playerId) {
            DB::table('tactic_players')->insert([
                'id' => Str::uuid()->toString(),
                'tactic_id' => $tacticId,
                'user_id' => $playerId,
                'position_x' => rand(10, 90) / 100.0,
                'position_y' => rand(10, 90) / 100.0,
                'role' => 'Pozycja ' . ($index + 1),
                'notes' => 'Wykonuj zadania taktyczne',
            ]);
        }
    }
}
