<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EventController extends Controller
{
    /**
     * List events (training sessions) with optional filtering/sorting.
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $page = (int) $request->input('page', 1);
        if ($perPage <= 0) {
            $perPage = 10;
        }
        if ($page <= 0) {
            $page = 1;
        }

        $search = $request->input('search');
        $teamId = $request->input('team_id');

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sortColumns = [
            'scheduled_at' => 'training_sessions.scheduled_at',
            'created_at' => 'training_sessions.created_at',
            'duration_minutes' => 'training_sessions.duration_minutes',
            'title' => 'training_sessions.title',
        ];
        $sortColumn = $sortColumns[$sortBy] ?? $sortColumns['created_at'];

        $baseQuery = DB::table('training_sessions')
            ->join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->join('users', 'users.id', '=', 'training_sessions.created_by')
            ->select([
                'training_sessions.*',
                'teams.name as team_name',
                'users.first_name as coach_first_name',
                'users.last_name as coach_last_name',
                'users.email as coach_email',
                'users.role as coach_role',
            ]);

        if (!empty($teamId)) {
            $baseQuery->where('training_sessions.team_id', $teamId);
        }

        if (!empty($search)) {
            $searchLike = '%' . $search . '%';
            $baseQuery->where(function ($q) use ($searchLike) {
                $q->where('training_sessions.title', 'like', $searchLike)
                    ->orWhere('training_sessions.description', 'like', $searchLike)
                    ->orWhere('teams.name', 'like', $searchLike);
            });
        }

        $total = (clone $baseQuery)->count();
        $offset = ($page - 1) * $perPage;

        $items = (clone $baseQuery)
            ->orderBy($sortColumn, $sortDir)
            ->offset($offset)
            ->limit($perPage)
            ->get();

        $lastPage = $perPage > 0 ? (int) ceil($total / $perPage) : 1;

        return response()->json([
            'data' => $items,
            'meta' => [
                'total' => $total,
                'per_page' => $perPage,
                'current_page' => $page,
                'last_page' => $lastPage,
            ],
        ], 200);
    }

    /**
     * Create a new event (training session).
     */
    public function store(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $validatedData = $request->validate([
            'team_id' => ['required', 'uuid', 'exists:teams,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'scheduled_at' => ['required', 'date'],
            'duration_minutes' => ['required', 'integer', 'min:1'],
            'canvas_data' => ['nullable', 'string'],
            'google_event_id' => ['nullable', 'string'],
        ]);

        $id = (string) Str::uuid();

        DB::table('training_sessions')->insert([
            'id' => $id,
            'team_id' => $validatedData['team_id'],
            'created_by' => $user->id,
            'title' => $validatedData['title'],
            'description' => $validatedData['description'] ?? null,
            'scheduled_at' => $validatedData['scheduled_at'],
            'duration_minutes' => $validatedData['duration_minutes'],
            'canvas_data' => $validatedData['canvas_data'] ?? null,
            'google_event_id' => $validatedData['google_event_id'] ?? null,
            'created_at' => now(),
        ]);

        $event = DB::table('training_sessions')
            ->join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->join('users', 'users.id', '=', 'training_sessions.created_by')
            ->select([
                'training_sessions.*',
                'teams.name as team_name',
                'users.first_name as coach_first_name',
                'users.last_name as coach_last_name',
                'users.email as coach_email',
                'users.role as coach_role',
            ])
            ->where('training_sessions.id', $id)
            ->first();

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event,
        ], 201);
    }

    /**
     * Get a single event (training session) by id.
     */
    public function show($id)
    {
        $event = DB::table('training_sessions')
            ->join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->join('users', 'users.id', '=', 'training_sessions.created_by')
            ->select([
                'training_sessions.*',
                'teams.name as team_name',
                'users.first_name as coach_first_name',
                'users.last_name as coach_last_name',
                'users.email as coach_email',
                'users.role as coach_role',
            ])
            ->where('training_sessions.id', $id)
            ->first();

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        return response()->json(['event' => $event], 200);
    }

    /**
     * Update an existing event (training session).
     */
    public function update(Request $request, $id)
    {
        $exists = DB::table('training_sessions')->where('id', $id)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $validatedData = $request->validate([
            'team_id' => ['sometimes', 'required', 'uuid', 'exists:teams,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'scheduled_at' => ['sometimes', 'required', 'date'],
            'duration_minutes' => ['sometimes', 'required', 'integer', 'min:1'],
            'canvas_data' => ['sometimes', 'nullable', 'string'],
            'google_event_id' => ['sometimes', 'nullable', 'string'],
        ]);

        DB::table('training_sessions')
            ->where('id', $id)
            ->update($validatedData);

        $event = DB::table('training_sessions')
            ->join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->join('users', 'users.id', '=', 'training_sessions.created_by')
            ->select([
                'training_sessions.*',
                'teams.name as team_name',
                'users.first_name as coach_first_name',
                'users.last_name as coach_last_name',
                'users.email as coach_email',
                'users.role as coach_role',
            ])
            ->where('training_sessions.id', $id)
            ->first();

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event,
        ], 200);
    }

    /**
     * Delete an event (training session).
     */
    public function destroy($id)
    {
        $deleted = DB::table('training_sessions')->where('id', $id)->delete();
        if ($deleted === 0) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        return response()->json(['message' => 'Event deleted successfully.'], 200);
    }
}
