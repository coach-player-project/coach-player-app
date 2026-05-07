<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

class EventController extends Controller
{
    #[OA\Get(
        path: '/api/admin/events',
        summary: 'Lista wydarzeń (treningów)',
        description: 'Zwraca listę wydarzeń (trening sessions) z możliwością filtrowania, sortowania i paginacji.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Fraza wyszukiwania po tytule, opisie lub nazwie drużyny', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'team_id', in: 'query', description: 'ID drużyny (UUID) do filtrowania wydarzeń', required: false, schema: new OA\Schema(type: 'string', format: 'uuid')),
            new OA\Parameter(name: 'sort_by', in: 'query', description: 'Kolumna sortowania (scheduled_at, created_at, duration_minutes, title)', required: false, schema: new OA\Schema(type: 'string', default: 'created_at')),
            new OA\Parameter(name: 'sort_dir', in: 'query', description: 'Kierunek sortowania (asc/desc)', required: false, schema: new OA\Schema(type: 'string', default: 'desc')),
            new OA\Parameter(name: 'per_page', in: 'query', description: 'Liczba wyników na stronę', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
            new OA\Parameter(name: 'page', in: 'query', description: 'Numer strony', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista wydarzeń została pobrana pomyślnie'),
        ]
    )]
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

    #[OA\Post(
        path: '/api/admin/events',
        summary: 'Utwórz nowe wydarzenie (trening)',
        description: 'Tworzy nowe wydarzenie treningowe powiązane z drużyną.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/x-www-form-urlencoded',
                schema: new OA\Schema(
                    required: ['team_id', 'title', 'scheduled_at', 'duration_minutes'],
                    properties: [
                        new OA\Property(property: 'team_id', type: 'string', format: 'uuid'),
                        new OA\Property(property: 'title', type: 'string'),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'scheduled_at', type: 'string', format: 'date-time'),
                        new OA\Property(property: 'duration_minutes', type: 'integer', minimum: 1),
                        new OA\Property(property: 'canvas_data', type: 'string', nullable: true),
                        new OA\Property(property: 'google_event_id', type: 'string', nullable: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Wydarzenie zostało utworzone pomyślnie'),
            new OA\Response(response: 401, description: 'Brak autoryzacji'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych'),
        ]
    )]
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

    #[OA\Get(
        path: '/api/admin/events/{id}',
        summary: 'Pobierz szczegóły wydarzenia',
        description: 'Zwraca pojedyncze wydarzenie (trening) na podstawie jego ID.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'ID wydarzenia (UUID)',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zostało pobrane pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono wydarzenia'),
        ]
    )]
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

    #[OA\Put(
        path: '/api/admin/events/{id}',
        summary: 'Zaktualizuj istniejące wydarzenie',
        description: 'Aktualizuje podane pola wydarzenia (treningu).',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'ID wydarzenia (UUID)',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\MediaType(
                mediaType: 'application/x-www-form-urlencoded',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: 'team_id', type: 'string', format: 'uuid', nullable: true),
                        new OA\Property(property: 'title', type: 'string', nullable: true),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'scheduled_at', type: 'string', format: 'date-time', nullable: true),
                        new OA\Property(property: 'duration_minutes', type: 'integer', minimum: 1, nullable: true),
                        new OA\Property(property: 'canvas_data', type: 'string', nullable: true),
                        new OA\Property(property: 'google_event_id', type: 'string', nullable: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zostało zaktualizowane pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono wydarzenia'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych'),
        ]
    )]
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

    #[OA\Delete(
        path: '/api/admin/events/{id}',
        summary: 'Usuń wydarzenie',
        description: 'Usuwa wydarzenie (trening) na podstawie ID.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'ID wydarzenia (UUID)',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zostało usunięte pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono wydarzenia'),
        ]
    )]
    public function destroy($id)
    {
        $deleted = DB::table('training_sessions')->where('id', $id)->delete();
        if ($deleted === 0) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        return response()->json(['message' => 'Event deleted successfully.'], 200);
    }
}
