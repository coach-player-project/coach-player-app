<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ApiFootballIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_coach_can_link_team_and_checks_permissions()
    {
        // 1. Setup Coach, Team
        $coach = User::create([
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'email' => 'coach@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'coach',
        ]);

        $team = Team::create([
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Testowy klub',
        ]);

        // Link coach to the team in team_coaches table
        DB::table('team_coaches')->insert([
            'id' => (string) Str::uuid(),
            'team_id' => $team->id,
            'user_id' => $coach->id,
            'role' => 'Główny trener',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2. Setup Another Coach (not belonging to the team)
        $otherCoach = User::create([
            'first_name' => 'Michal',
            'last_name' => 'Nowak',
            'email' => 'other_coach@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'coach',
        ]);

        // 3. Test that coach_id attribute works correctly on the Team model
        $this->assertEquals($coach->id, $team->coach_id);

        // 4. Test linking team - should succeed for the authorized coach
        // We will mock the ApiFootballService fixture sync or prevent it
        $payload = [
            'api_team_id' => 1234,
            'api_league_id' => 5678,
            'api_season' => 2024,
            'api_team_name' => 'Real Test',
            'import_fixtures' => false // Set to false to avoid external service calls
        ];

        // Authenticate as the team's coach
        \Laravel\Sanctum\Sanctum::actingAs($coach);
        $response = $this->postJson("/api/coach/teams/{$team->id}/link-api-football", $payload);
        $response->assertStatus(200);

        // Verify changes in the database
        $this->assertDatabaseHas('teams', [
            'id' => $team->id,
            'api_football_team_id' => 1234,
            'api_football_league_id' => 5678,
            'api_football_season' => 2024,
            'api_football_team_name' => 'Real Test',
        ]);

        // 5. Test linking team - should fail for another coach
        \Laravel\Sanctum\Sanctum::actingAs($otherCoach);
        $failPayload = [
            'api_team_id' => 9999,
            'api_league_id' => 8888,
            'api_season' => 2024,
            'api_team_name' => 'Fake Real',
            'import_fixtures' => false
        ];
        $failResponse = $this->postJson("/api/coach/teams/{$team->id}/link-api-football", $failPayload);
        $failResponse->assertStatus(403);
        $failResponse->assertJsonFragment([
            'message' => 'Nie masz uprawnień do tej drużyny.'
        ]);
    }
}
