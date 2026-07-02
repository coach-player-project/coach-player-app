<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TeamMembershipTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manually_add_user_to_team()
    {
        // 1. Setup Admin, User (Player), and Team
        $admin = User::create([
            'first_name' => 'Adam',
            'last_name' => 'Admin',
            'email' => 'admin@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        $team = Team::create([
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Testowy klub',
        ]);

        // 2. Authenticate as Admin and create user directly assigned to team
        \Laravel\Sanctum\Sanctum::actingAs($admin);

        $createPayload = [
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'email' => 'jan.player@example.com',
            'phone' => '+48111222333',
            'role' => 'player',
            'password' => 'password123',
            'team_id' => $team->id,
        ];

        $createResponse = $this->postJson('/api/admin/users', $createPayload);
        $createResponse->assertStatus(201);

        $newPlayer = User::where('email', 'jan.player@example.com')->first();
        $this->assertNotNull($newPlayer);

        // Verify the user is directly approved in team_members
        $this->assertDatabaseHas('team_members', [
            'team_id' => $team->id,
            'user_id' => $newPlayer->id,
            'status' => 'approved',
        ]);

        // 3. Test changing user's team as admin via update
        $anotherTeam = Team::create([
            'name' => 'Kolejny Klub',
            'description' => 'Inny klub',
        ]);

        $updatePayload = [
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'email' => 'jan.player@example.com',
            'phone' => '+48111222333',
            'role' => 'player',
            'team_id' => $anotherTeam->id,
        ];

        $updateResponse = $this->putJson("/api/admin/users/{$newPlayer->id}", $updatePayload);
        $updateResponse->assertStatus(200);

        // Verify old team association is removed and new is added (approved)
        $this->assertDatabaseMissing('team_members', [
            'team_id' => $team->id,
            'user_id' => $newPlayer->id,
        ]);
        $this->assertDatabaseHas('team_members', [
            'team_id' => $anotherTeam->id,
            'user_id' => $newPlayer->id,
            'status' => 'approved',
        ]);
    }

    public function test_user_can_resend_join_request_after_rejection()
    {
        // 1. Setup Player and Team
        $player = User::create([
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'email' => 'player@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'player',
        ]);

        $team = Team::create([
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Testowy klub',
        ]);

        // Insert a rejected request in the database
        DB::table('team_members')->insert([
            'id' => (string) Str::uuid(),
            'team_id' => $team->id,
            'user_id' => $player->id,
            'status' => 'rejected',
            'joined_at' => now()->subDays(2),
        ]);

        // 2. Request to join again (should overwrite the rejected request with a new pending request)
        \Laravel\Sanctum\Sanctum::actingAs($player);

        $response = $this->postJson('/api/user/join-team', [
            'team_id' => $team->id,
        ]);
        $response->assertStatus(200);

        // 3. Verify rejected record is gone and a pending record is in its place
        $this->assertDatabaseMissing('team_members', [
            'user_id' => $player->id,
            'status' => 'rejected',
        ]);

        $this->assertDatabaseHas('team_members', [
            'user_id' => $player->id,
            'team_id' => $team->id,
            'status' => 'pending',
        ]);
    }
}
