<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TacticController extends Controller
{
    // -------------------------------------------------------------------------
    // Coach endpoints
    // -------------------------------------------------------------------------

    /**
     * Lista taktyk trenera.
     */
    public function coachIndex(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $tactics = DB::table('tactics')
            ->join('teams', 'teams.id', '=', 'tactics.team_id')
            ->where('tactics.created_by', $user->id)
            ->select(
                'tactics.id',
                'tactics.title',
                'tactics.description',
                'tactics.formation',
                'tactics.match_date',
                'tactics.created_at',
                'teams.name as team_name',
                'teams.id as team_id'
            )
            ->orderBy('tactics.created_at', 'desc')
            ->get();

        return response()->json(['data' => $tactics], 200);
    }

    /**
     * Utwórz nową taktykę.
     */
    public function coachStore(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $validated = $request->validate([
            'team_id'     => ['required', 'uuid', 'exists:teams,id'],
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'canvas_data' => ['nullable', 'string'],
            'formation'   => ['nullable', 'string', 'max:50'],
            'match_date'  => ['nullable', 'date'],
        ]);

        // Upewnij się, że trener jest właścicielem drużyny
        if (!$this->coachOwnsTeam($user->id, $validated['team_id'])) {
            return response()->json(['message' => 'Nie masz uprawnień do tej drużyny.'], 403);
        }

        $id = (string) Str::uuid();

        DB::table('tactics')->insert([
            'id'          => $id,
            'team_id'     => $validated['team_id'],
            'created_by'  => $user->id,
            'title'       => $validated['title'],
            'description' => $validated['description'] ?? null,
            'canvas_data' => $validated['canvas_data'] ?? null,
            'formation'   => $validated['formation'] ?? null,
            'match_date'  => isset($validated['match_date']) ? $validated['match_date'] : null,
            'created_at'  => now(),
        ]);

        $tactic = $this->findTacticById($id);

        return response()->json([
            'message' => 'Taktyka została utworzona.',
            'tactic'  => $tactic,
        ], 201);
    }

    /**
     * Pobierz szczegóły taktyki.
     */
    public function coachShow(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsTactic($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tej taktyki.'], 403);
        }

        $tactic = $this->findTacticById($id);
        if (!$tactic) {
            return response()->json(['message' => 'Nie znaleziono taktyki.'], 404);
        }

        return response()->json(['tactic' => $tactic], 200);
    }

    /**
     * Zaktualizuj taktykę (w tym canvas_data).
     */
    public function coachUpdate(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsTactic($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tej taktyki.'], 403);
        }

        $validated = $request->validate([
            'title'       => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'canvas_data' => ['sometimes', 'nullable', 'string'],
            'formation'   => ['sometimes', 'nullable', 'string', 'max:50'],
            'match_date'  => ['sometimes', 'nullable', 'date'],
        ]);

        if (empty($validated)) {
            return response()->json(['message' => 'Brak pól do aktualizacji.'], 422);
        }

        DB::table('tactics')->where('id', $id)->update($validated);

        $tactic = $this->findTacticById($id);

        return response()->json([
            'message' => 'Taktyka została zaktualizowana.',
            'tactic'  => $tactic,
        ], 200);
    }

    /**
     * Usuń taktykę.
     */
    public function coachDestroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsTactic($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tej taktyki.'], 403);
        }

        $deleted = DB::table('tactics')->where('id', $id)->delete();
        if ($deleted === 0) {
            return response()->json(['message' => 'Nie znaleziono taktyki.'], 404);
        }

        return response()->json(['message' => 'Taktyka została usunięta.'], 200);
    }

    // -------------------------------------------------------------------------
    // Player endpoints
    // -------------------------------------------------------------------------

    /**
     * Lista taktyk przypisanych do drużyn zawodnika.
     */
    public function playerIndex(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $teamIds = DB::table('team_members')
            ->where('user_id', $user->id)
            ->where('status', 'approved')
            ->pluck('team_id');

        if ($teamIds->isEmpty()) {
            return response()->json(['data' => []], 200);
        }

        $tactics = DB::table('tactics')
            ->join('teams', 'teams.id', '=', 'tactics.team_id')
            ->leftJoin('users', 'users.id', '=', 'tactics.created_by')
            ->leftJoin('team_coaches', function ($join) {
                $join->on('team_coaches.team_id', '=', 'tactics.team_id')
                     ->on('team_coaches.user_id', '=', 'tactics.created_by');
            })
            ->whereIn('tactics.team_id', $teamIds)
            ->select(
                'tactics.id',
                'tactics.title',
                'tactics.description',
                'tactics.formation',
                'tactics.match_date',
                'tactics.created_at',
                'teams.name as team_name',
                'teams.id as team_id',
                'users.first_name as creator_first_name',
                'users.last_name as creator_last_name',
                'team_coaches.role as creator_role'
            )
            ->orderBy('tactics.created_at', 'desc')
            ->get();

        return response()->json(['data' => $tactics], 200);
    }

    /**
     * Szczegóły taktyki dla zawodnika.
     */
    public function playerShow(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $tactic = $this->findTacticById($id);
        if (!$tactic) {
            return response()->json(['message' => 'Nie znaleziono taktyki.'], 404);
        }

        $isMember = DB::table('team_members')
            ->where('user_id', $user->id)
            ->where('team_id', $tactic->team_id)
            ->where('status', 'approved')
            ->exists();

        if (!$isMember) {
            return response()->json(['message' => 'Nie masz uprawnień do tej taktyki.'], 403);
        }

        return response()->json(['tactic' => $tactic], 200);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------


    private function findTacticById(string $id)
    {
        return DB::table('tactics')
            ->join('teams', 'teams.id', '=', 'tactics.team_id')
            ->leftJoin('users', 'users.id', '=', 'tactics.created_by')
            ->leftJoin('team_coaches', function ($join) {
                $join->on('team_coaches.team_id', '=', 'tactics.team_id')
                     ->on('team_coaches.user_id', '=', 'tactics.created_by');
            })
            ->where('tactics.id', $id)
            ->select(
                'tactics.*',
                'teams.name as team_name',
                'users.first_name as creator_first_name',
                'users.last_name as creator_last_name',
                'users.email as creator_email',
                'team_coaches.role as creator_role'
            )
            ->first();
    }

    private function coachOwnsTeam(string $coachId, string $teamId): bool
    {
        return DB::table('team_coaches')
            ->where('team_id', $teamId)
            ->where('user_id', $coachId)
            ->exists();
    }

    private function coachOwnsTactic(string $coachId, string $tacticId): bool
    {
        return DB::table('tactics')
            ->where('id', $tacticId)
            ->where('created_by', $coachId)
            ->exists();
    }
}
