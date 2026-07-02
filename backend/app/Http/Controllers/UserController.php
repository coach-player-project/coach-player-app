<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use OpenApi\Attributes as OA;

class UserController extends Controller
{
    /**
     * Update the authenticated user's profile settings.
     */
    #[OA\Put(
        path: '/api/user',
        summary: 'Aktualizacja profilu',
        description: 'Aktualizuje profil obecnie zalogowanego użytkownika',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/x-www-form-urlencoded',
                schema: new OA\Schema(
                    required: ['first_name', 'last_name'],
                    properties: [
                        new OA\Property(property: 'first_name', type: 'string'),
                        new OA\Property(property: 'last_name', type: 'string'),
                        new OA\Property(property: 'phone', type: 'string', nullable: true),
                        new OA\Property(property: 'password', type: 'string', nullable: true)
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Profil zaaktualizowany')
        ]
    )]
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validatedData = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $user->first_name = $validatedData['first_name'];
        $user->last_name = $validatedData['last_name'];
        if (array_key_exists('phone', $validatedData)) {
            $user->phone = $validatedData['phone'];
        }

        if (!empty($validatedData['password'])) {
            $user->password_hash = Hash::make($validatedData['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Request to join a team (resend/override pending or rejected requests).
     */
    public function joinTeam(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'admin') {
            return response()->json(['message' => 'Administratorzy nie dołączają do drużyn.'], 400);
        }

        $validated = $request->validate([
            'team_id' => ['required', 'uuid', 'exists:teams,id'],
        ]);

        // Check if there is already an approved membership
        $approved = \Illuminate\Support\Facades\DB::table('team_members')
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->exists();

        if ($approved) {
            return response()->json(['message' => 'Należysz już do zatwierdzonej drużyny.'], 400);
        }

        // Delete any pending/rejected requests for this user
        \Illuminate\Support\Facades\DB::table('team_members')
            ->where('user_id', $user->id)
            ->delete();

        // If coach, detach coached teams to start fresh
        if ($user->role === 'coach') {
            $user->coachedTeams()->detach();
        }

        // Create new membership request
        \Illuminate\Support\Facades\DB::table('team_members')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'team_id' => $validated['team_id'],
            'user_id' => $user->id,
            'status' => 'pending',
            'joined_at' => now(),
        ]);

        return response()->json([
            'message' => 'Prośba o dołączenie do drużyny została wysłana.'
        ], 200);
    }
}
