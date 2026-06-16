<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\FatigueRating;
use App\Models\TrainingSession;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class DashboardController extends Controller
{
    /**
     * Get all players belonging to teams coached by the authenticated coach.
     */
    public function coachPlayers(Request $request)
    {
        $coach = $request->user();
        if (!$coach) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        // Get team IDs coached by this coach
        $teamIds = Team::whereHas('coaches', function ($q) use ($coach) {
            $q->where('users.id', $coach->id);
        })->pluck('id');

        // Fetch approved members in these teams
        $memberships = TeamMember::whereIn('team_id', $teamIds)
            ->where('status', TeamMember::STATUS_APPROVED)
            ->with(['user', 'team'])
            ->get();

        $players = [];
        foreach ($memberships as $membership) {
            $user = $membership->user;
            if (!$user) {
                continue;
            }

            // Get their latest fatigue rating
            $latestRating = FatigueRating::where('user_id', $user->id)
                ->orderByDesc('submitted_at')
                ->first();

            $players[] = [
                'id' => $membership->id,
                'user_id' => $user->id,
                'name' => $user->first_name . ' ' . $user->last_name,
                'email' => $user->email,
                'phone' => $user->phone ?? '-',
                'team_name' => $membership->team ? $membership->team->name : '-',
                'last_fatigue_rating' => $latestRating ? $latestRating->rating : null,
                'last_fatigue_submitted_at' => $latestRating ? $latestRating->submitted_at->toIso8601String() : null,
                'avatar_initials' => strtoupper(substr($user->first_name, 0, 1) . substr($user->last_name, 0, 1)),
            ];
        }

        return response()->json([
            'players' => $players
        ]);
    }

    /**
     * Get player dashboard summary stats.
     */
    public function playerSummary(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        // Get team memberships for the player
        $teamIds = TeamMember::where('user_id', $user->id)
            ->where('status', TeamMember::STATUS_APPROVED)
            ->pluck('team_id')
            ->toArray();

        if (empty($teamIds)) {
            return response()->json([
                'next_event' => null,
                'unrated_past_event' => null,
                'average_fatigue' => null,
                'message' => 'Nie należysz do żadnej drużyny.'
            ]);
        }

        // Closest upcoming training or match (scheduled_at >= now)
        $nextEvent = $this->basePlayerEventQuery($user->id)
            ->whereIn('training_sessions.team_id', $teamIds)
            ->where('training_sessions.scheduled_at', '>=', now())
            ->orderBy('training_sessions.scheduled_at', 'asc')
            ->first();

        // Closest past training or match (scheduled_at < now) with no fatigue rating from this player
        $unratedPastEvent = $this->basePlayerEventQuery($user->id)
            ->whereIn('training_sessions.team_id', $teamIds)
            ->where('training_sessions.scheduled_at', '<', now())
            ->whereNull('fatigue_ratings.id') // no fatigue rating exists for this player/session
            ->orderBy('training_sessions.scheduled_at', 'desc')
            ->first();

        // Average fatigue rating over the last 30 days
        $averageFatigue = FatigueRating::where('user_id', $user->id)
            ->where('submitted_at', '>=', now()->subDays(30))
            ->avg('rating');

        return response()->json([
            'next_event' => $nextEvent,
            'unrated_past_event' => $unratedPastEvent,
            'average_fatigue' => $averageFatigue ? round($averageFatigue, 1) : null,
        ]);
    }

    /**
     * Local query builder helper (similar to EventController) to load training_sessions join teams/users/attendance/fatigue
     */
    private function basePlayerEventQuery(string $playerId)
    {
        $query = TrainingSession::join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->join('users', 'users.id', '=', 'training_sessions.created_by')
            ->leftJoin('team_coaches', function ($join) {
                $join->on('team_coaches.team_id', '=', 'training_sessions.team_id')
                     ->on('team_coaches.user_id', '=', 'training_sessions.created_by');
            });

        $selects = [
            'training_sessions.*',
            'teams.name as team_name',
            'users.first_name as coach_first_name',
            'users.last_name as coach_last_name',
            'users.email as coach_email',
            'team_coaches.role as creator_role',
        ];

        // Join attendance for player
        $query->leftJoin('attendance', function ($join) use ($playerId) {
            $join->on('attendance.training_id', '=', 'training_sessions.id')
                 ->where('attendance.user_id', '=', $playerId);
        });
        $selects[] = 'attendance.status as attendance_status';
        $selects[] = 'attendance.note as attendance_note';
        $selects[] = 'attendance.responded_at as attendance_responded_at';

        // Join fatigue_ratings for player
        $query->leftJoin('fatigue_ratings', function ($join) use ($playerId) {
            $join->on('fatigue_ratings.training_id', '=', 'training_sessions.id')
                 ->where('fatigue_ratings.user_id', '=', $playerId);
        });
        $selects[] = 'fatigue_ratings.id as fatigue_rating_id';
        $selects[] = 'fatigue_ratings.rating as player_fatigue_rating';
        $selects[] = 'fatigue_ratings.submitted_at as player_fatigue_submitted_at';

        return $query->select($selects);
    }
}
