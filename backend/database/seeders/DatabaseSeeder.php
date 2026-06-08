<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->resetDatabase();

        // 1. Create Admin
        $adminId = Str::uuid()->toString();
        DB::table('users')->insert([
            'id' => $adminId,
            'email' => 'admin@example.com',
            'password_hash' => Hash::make('password123'),
            'first_name' => 'Adam',
            'last_name' => 'Administrator',
            'role' => 'admin',
            'avatar_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Create Coach 1
        $coachId = Str::uuid()->toString();
        DB::table('users')->insert([
            'id' => $coachId,
            'email' => 'coach@example.com',
            'password_hash' => Hash::make('password123'),
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'role' => 'coach',
            'avatar_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=coach1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Create Coach 2
        $coach2Id = Str::uuid()->toString();
        DB::table('users')->insert([
            'id' => $coach2Id,
            'email' => 'coach2@example.com',
            'password_hash' => Hash::make('password123'),
            'first_name' => 'Piotr',
            'last_name' => 'Nowak',
            'role' => 'coach',
            'avatar_url' => 'https://api.dicebear.com/7.x/avataaars/svg?seed=coach2',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 3. Create Players (22 total: 11 for Team 1, 11 for Team 2)
        $playerIds = [];
        for ($i = 1; $i <= 22; $i++) {
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

        // 4. Create Team 1
        $teamId = Str::uuid()->toString();
        DB::table('teams')->insert([
            'id' => $teamId,
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Najlepszy wirtualny klub piłkarski w aplikacji.',
            'coach_id' => $coachId,
            'created_at' => now()->subDays(30),
        ]);

        // Create Team 2
        $team2Id = Str::uuid()->toString();
        DB::table('teams')->insert([
            'id' => $team2Id,
            'name' => 'Orły Warszawa',
            'description' => 'Stołeczny klub z tradycjami, gotowy na rywalizację.',
            'coach_id' => $coach2Id,
            'created_at' => now()->subDays(30),
        ]);

        // Create other dummy teams
        $teamNames = [
            'Polonia Kraków', 'Wisła Poznań', 'Warta Gdańsk', 'Lech Wrocław',
            'Cracovia Łódź', 'Śląsk Gdynia', 'Pogoń Katowice', 'Górnik Toruń', 'Sparta Bydgoszcz',
            'Odra Opole', 'Miedź Legnica', 'Arka Lublin', 'Zawisza Białystok', 'Stal Rzeszów',
            'Widzew Częstochowa', 'Motor Radom', 'Raków Kielce', 'Korona Olsztyn', 'Piast Gliwice',
            'Sandecja Nowy Sącz', 'GKS Tychy', 'Zagłębie Sosnowiec', 'Podbeskidzie Bielsko', 'Chojniczanka'
        ];

        foreach ($teamNames as $index => $name) {
            $extraCoachId = Str::uuid()->toString();
            $emailNum = $index + 1;
            
            DB::table('users')->insert([
                'id' => $extraCoachId,
                'email' => "coach_extra{$emailNum}@example.com",
                'password_hash' => Hash::make('password123'),
                'first_name' => "Trener",
                'last_name' => "Dodatkowy {$emailNum}",
                'role' => 'coach',
                'avatar_url' => "https://api.dicebear.com/7.x/avataaars/svg?seed=coach_extra{$emailNum}",
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('teams')->insert([
                'id' => Str::uuid()->toString(),
                'name' => $name,
                'description' => 'Przykładowa drużyna wygenerowana dla potrzeb testowania paginacji i sortowania SFP.',
                'coach_id' => $extraCoachId,
                'created_at' => now()->subDays(rand(1, 100)),
            ]);
        }

        // 5. Assign Players to Teams (1-11 to Team 1, 12-22 to Team 2) with status 'approved'
        foreach (array_slice($playerIds, 0, 11) as $playerId) {
            DB::table('team_members')->insert([
                'id' => Str::uuid()->toString(),
                'team_id' => $teamId,
                'user_id' => $playerId,
                'status' => 'approved',
                'joined_at' => now()->subDays(rand(1, 25)),
            ]);
        }

        foreach (array_slice($playerIds, 11, 11) as $playerId) {
            DB::table('team_members')->insert([
                'id' => Str::uuid()->toString(),
                'team_id' => $team2Id,
                'user_id' => $playerId,
                'status' => 'approved',
                'joined_at' => now()->subDays(rand(1, 25)),
            ]);
        }

        // 6. Create Training Session
        $trainingId = Str::uuid()->toString();
        DB::table('training_sessions')->insert([
            'id' => $trainingId,
            'team_id' => $teamId,
            'created_by' => $coachId,
            'event_type' => 'training',
            'title' => 'Trening wydajnościowy',
            'description' => 'Skupiamy się na motoryce i kondycji po przerwie.',
            'scheduled_at' => now()->addDays(2),
            'duration_minutes' => 90,
            'canvas_data' => null,
            'google_event_id' => null,
            'created_at' => now()->subDays(1),
        ]);

        // 7. Create Training Exercises
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

        // 8. Create past training for Attendance and Fatigue ratings
        $pastTrainingId = Str::uuid()->toString();
        DB::table('training_sessions')->insert([
            'id' => $pastTrainingId,
            'team_id' => $teamId,
            'created_by' => $coachId,
            'event_type' => 'training',
            'title' => 'Trening taktyczny',
            'description' => 'Omawiamy nowe zagrywki.',
            'scheduled_at' => now()->subDays(2),
            'duration_minutes' => 120,
            'canvas_data' => null,
            'google_event_id' => null,
            'created_at' => now()->subDays(5),
        ]);

        DB::table('training_sessions')->insert([
            'id' => Str::uuid()->toString(),
            'team_id' => $teamId,
            'created_by' => $coachId,
            'event_type' => 'match',
            'title' => 'Mecz ligowy — KS Fikcyjny vs Orły',
            'description' => 'Kolejka 12. Stadion miejski, godz. 18:00.',
            'scheduled_at' => now()->addDays(5),
            'duration_minutes' => 105,
            'canvas_data' => null,
            'google_event_id' => null,
            'created_at' => now(),
        ]);

        // 9. Add Attendance & Fatigue Ratings for past training
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

        // 10. Tactics
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

        // 11. Tactic Players
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

        // 12. Player Attendance Seeder
        $this->call(PlayerAttendanceSeeder::class);
    }

    /**
     * Clears application data so db:seed can be re-run safely.
     * Use migrate:fresh --seed for a full schema reset.
     */
    private function resetDatabase(): void
    {
        Schema::disableForeignKeyConstraints();

        $tables = [
            'tactic_players',
            'fatigue_ratings',
            'attendance',
            'training_exercises',
            'tactics',
            'training_sessions',
            'messages',
            'team_members',
            'teams',
            'personal_access_tokens',
            'users',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->delete();
            }
        }

        Schema::enableForeignKeyConstraints();
    }
}
