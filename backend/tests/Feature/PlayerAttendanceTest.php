<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PlayerAttendanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_player_attendance_declaration_flow()
    {
        // 1. Setup Coach, Team, and Approved Player
        $coach = User::create([
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'email' => 'coach@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'coach',
        ]);

        $teamId = (string) Str::uuid();
        DB::table('teams')->insert([
            'id' => $teamId,
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Testowy klub',
            'created_at' => now(),
        ]);

        DB::table('team_coaches')->insert([
            'id' => (string) Str::uuid(),
            'team_id' => $teamId,
            'user_id' => $coach->id,
            'role' => 'Główny trener',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $approvedPlayer = User::create([
            'first_name' => 'Zatwierdzony',
            'last_name' => 'Zawodnik',
            'email' => 'player_ok@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'player',
        ]);

        DB::table('team_members')->insert([
            'id' => (string) Str::uuid(),
            'team_id' => $teamId,
            'user_id' => $approvedPlayer->id,
            'status' => 'approved',
            'joined_at' => now(),
        ]);

        // 2. Setup Unapproved Player
        $unapprovedPlayer = User::create([
            'first_name' => 'Niezweryfikowany',
            'last_name' => 'Zawodnik',
            'email' => 'player_bad@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'player',
        ]);

        DB::table('team_members')->insert([
            'id' => (string) Str::uuid(),
            'team_id' => $teamId,
            'user_id' => $unapprovedPlayer->id,
            'status' => 'pending',
            'joined_at' => now(),
        ]);

        // 3. Create Training Session
        $trainingId = (string) Str::uuid();
        DB::table('training_sessions')->insert([
            'id' => $trainingId,
            'team_id' => $teamId,
            'created_by' => $coach->id,
            'event_type' => 'training',
            'title' => 'Trening wydajnościowy',
            'description' => 'Opis treningu.',
            'scheduled_at' => now()->addDays(2),
            'duration_minutes' => 90,
            'created_at' => now(),
        ]);

        // 4. Test Unauthenticated Request
        $this->postJson("/api/player/events/{$trainingId}/attendance", ['status' => 'obecny'])
            ->assertStatus(401);

        // 5. Test Unapproved Player Request (Should be Forbidden 403)
        $this->actingAs($unapprovedPlayer)
            ->postJson("/api/player/events/{$trainingId}/attendance", ['status' => 'obecny'])
            ->assertStatus(403);

        // 6. Test Approved Player Declarations
        // Check initial list has no attendance
        $listResponse = $this->actingAs($approvedPlayer)
            ->getJson('/api/player/events');
        
        $listResponse->assertStatus(200);
        $this->assertNull($listResponse->json('data.0.attendance_status'));

        // Declare presence
        $declareResponse = $this->actingAs($approvedPlayer)
            ->postJson("/api/player/events/{$trainingId}/attendance", [
                'status' => 'obecny',
                'note' => 'Będę na pewno!',
            ]);

        $declareResponse->assertStatus(200)
            ->assertJsonPath('event.attendance_status', 'obecny')
            ->assertJsonPath('event.attendance_note', 'Będę na pewno!');

        // Check DB directly
        $this->assertDatabaseHas('attendance', [
            'training_id' => $trainingId,
            'user_id' => $approvedPlayer->id,
            'status' => 'obecny',
            'note' => 'Będę na pewno!',
        ]);

        // Show endpoint includes attendance
        $showResponse = $this->actingAs($approvedPlayer)
            ->getJson("/api/player/events/{$trainingId}");
        
        $showResponse->assertStatus(200)
            ->assertJsonPath('event.attendance_status', 'obecny')
            ->assertJsonPath('event.attendance_note', 'Będę na pewno!');

        // Declare absence (update existing)
        $updateResponse = $this->actingAs($approvedPlayer)
            ->postJson("/api/player/events/{$trainingId}/attendance", [
                'status' => 'nieobecny',
                'note' => 'Choroba, gorączka.',
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('event.attendance_status', 'nieobecny')
            ->assertJsonPath('event.attendance_note', 'Choroba, gorączka.');

        $this->assertDatabaseHas('attendance', [
            'training_id' => $trainingId,
            'user_id' => $approvedPlayer->id,
            'status' => 'nieobecny',
            'note' => 'Choroba, gorączka.',
        ]);
    }
}
