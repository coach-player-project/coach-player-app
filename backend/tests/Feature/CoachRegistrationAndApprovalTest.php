<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CoachRegistrationAndApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_coach_registration_and_approval_flow()
    {
        // 1. Setup a team and an admin
        $admin = User::create([
            'first_name' => 'Adam',
            'last_name' => 'Admin',
            'email' => 'admin@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'admin',
        ]);

        $dummyCoach = User::create([
            'first_name' => 'Dummy',
            'last_name' => 'Coach',
            'email' => 'dummy@example.com',
            'password_hash' => Hash::make('password123'),
            'role' => 'coach',
        ]);

        $teamId = (string) Str::uuid();
        DB::table('teams')->insert([
            'id' => $teamId,
            'name' => 'KS Fikcyjny Klub',
            'description' => 'Testowy klub',
            'coach_id' => $dummyCoach->id,
            'created_at' => now(),
        ]);

        $teamRecord = DB::table('teams')->first();

        // 2. Register a coach via the Auth API
        $registrationData = [
            'first_name' => 'Jan',
            'last_name' => 'Kowalski',
            'email' => 'coach_jan@example.com',
            'password' => 'password123',
            'role' => 'coach',
            'team_id' => $teamId,
        ];

        $response = $this->postJson('/api/auth/register', $registrationData);
        $response->assertStatus(201);

        // 3. Verify user is in db and team membership is pending
        $coach = User::where('email', 'coach_jan@example.com')->first();
        $this->assertNotNull($coach);
        $this->assertEquals('coach', $coach->role);

        $membership = DB::table('team_members')
            ->where('user_id', $coach->id)
            ->first();

        $this->assertNotNull($membership);
        $this->assertEquals('pending', $membership->status);
        $this->assertEquals($teamId, $membership->team_id);

        // Verify team does NOT have coach_id set to the new coach yet (it should still be dummy coach)
        $updatedTeam = DB::table('teams')->where('id', $teamId)->first();
        $this->assertEquals($dummyCoach->id, $updatedTeam->coach_id);

        // 4. Authenticate as admin and view pending memberships
        \Laravel\Sanctum\Sanctum::actingAs($admin);

        $viewResponse = $this->getJson('/api/admin/team-members?status=pending');

        $viewResponse->assertStatus(200);
        $viewResponse->assertJsonFragment([
            'email' => 'coach_jan@example.com',
            'role' => 'coach'
        ]);

        // 5. Approve membership as admin
        $approveResponse = $this->postJson("/api/admin/team-members/{$membership->id}/approve");

        $approveResponse->assertStatus(200);

        // 6. Verify membership is approved and team's coach_id is set
        $updatedMembership = DB::table('team_members')
            ->where('id', $membership->id)
            ->first();
        $this->assertEquals('approved', $updatedMembership->status);

        $finalTeam = DB::table('teams')->where('id', $teamId)->first();
        $this->assertEquals($coach->id, $finalTeam->coach_id);

        // 7. Verify coach can now access their team
        \Laravel\Sanctum\Sanctum::actingAs($coach);
        
        $coachTeamsResponse = $this->getJson('/api/coach/teams');

        $coachTeamsResponse->assertStatus(200);
        $coachTeamsResponse->assertJsonFragment([
            'id' => $teamId,
            'name' => 'KS Fikcyjny Klub'
        ]);
    }
}
