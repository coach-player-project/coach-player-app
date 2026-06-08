<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;
use App\Models\TrainingSession;
use App\Models\Attendance;
use App\Models\TeamMember;
use App\Models\Team;
use App\Models\FatigueRating;

class EventController extends Controller
{
    private const EVENT_TYPES = ['training', 'match'];

    // -------------------------------------------------------------------------
    // Admin endpoints
    // -------------------------------------------------------------------------

    #[OA\Get(
        path: '/api/admin/events',
        summary: 'Lista wydarzeń (treningów)',
        description: 'Zwraca listę wydarzeń (trening sessions) z możliwością filtrowania, sortowania i paginacji.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'team_id', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'uuid')),
            new OA\Parameter(name: 'event_type', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['training', 'match'])),
            new OA\Parameter(name: 'sort_by', in: 'query', required: false, schema: new OA\Schema(type: 'string', default: 'created_at')),
            new OA\Parameter(name: 'sort_dir', in: 'query', required: false, schema: new OA\Schema(type: 'string', default: 'desc')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista wydarzeń została pobrana pomyślnie'),
        ]
    )]
    public function index(Request $request)
    {
        return $this->listEvents($request);
    }

    #[OA\Post(
        path: '/api/admin/events',
        summary: 'Utwórz nowe wydarzenie',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 201, description: 'Wydarzenie zostało utworzone pomyślnie'),
        ]
    )]
    public function store(Request $request)
    {
        return $this->createEvent($request);
    }

    #[OA\Get(
        path: '/api/admin/events/{id}',
        summary: 'Pobierz szczegóły wydarzenia',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zostało pobrane pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono wydarzenia'),
        ]
    )]
    public function show($id)
    {
        return $this->getEvent($id);
    }

    #[OA\Put(
        path: '/api/admin/events/{id}',
        summary: 'Zaktualizuj istniejące wydarzenie',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zostało zaktualizowane pomyślnie'),
        ]
    )]
    public function update(Request $request, $id)
    {
        return $this->updateEvent($request, $id);
    }

    #[OA\Delete(
        path: '/api/admin/events/{id}',
        summary: 'Usuń wydarzenie',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zostało usunięte pomyślnie'),
        ]
    )]
    public function destroy($id)
    {
        return $this->deleteEvent($id);
    }

    // -------------------------------------------------------------------------
    // Coach endpoints (scoped to coach teams)
    // -------------------------------------------------------------------------

    #[OA\Get(
        path: '/api/coach/events',
        summary: 'Lista wydarzeń trenera',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Lista wydarzeń trenera'),
        ]
    )]
    public function coachIndex(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        return $this->listEvents($request, $user->id);
    }

    #[OA\Post(
        path: '/api/coach/events',
        summary: 'Utwórz wydarzenie (trener)',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 201, description: 'Wydarzenie utworzone'),
        ]
    )]
    public function coachStore(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $validated = $this->validateEventPayload($request, true);
        if ($validated instanceof \Illuminate\Http\JsonResponse) {
            return $validated;
        }

        if (!$this->coachOwnsTeam($user->id, $validated['team_id'])) {
            return response()->json(['message' => 'Nie masz uprawnień do tej drużyny.'], 403);
        }

        return $this->createEvent($request, $validated);
    }

    #[OA\Get(
        path: '/api/coach/events/{id}',
        summary: 'Szczegóły wydarzenia (trener)',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie pobrane'),
            new OA\Response(response: 403, description: 'Brak uprawnień'),
            new OA\Response(response: 404, description: 'Nie znaleziono'),
        ]
    )]
    public function coachShow(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        return $this->getEvent($id);
    }

    #[OA\Put(
        path: '/api/coach/events/{id}',
        summary: 'Aktualizuj wydarzenie (trener)',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie zaktualizowane'),
        ]
    )]
    public function coachUpdate(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        $validated = $this->validateEventPayload($request, false);
        if ($validated instanceof \Illuminate\Http\JsonResponse) {
            return $validated;
        }

        if (isset($validated['team_id']) && !$this->coachOwnsTeam($user->id, $validated['team_id'])) {
            return response()->json(['message' => 'Nie masz uprawnień do tej drużyny.'], 403);
        }

        return $this->updateEvent($request, $id, $validated);
    }

    #[OA\Delete(
        path: '/api/coach/events/{id}',
        summary: 'Usuń wydarzenie (trener)',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie usunięte'),
        ]
    )]
    public function coachDestroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        return $this->deleteEvent($id);
    }

    // -------------------------------------------------------------------------
    // Player endpoints (scoped to player approved teams)
    // -------------------------------------------------------------------------

    #[OA\Get(
        path: '/api/player/events',
        summary: 'Lista wydarzeń zawodnika',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Lista wydarzeń zawodnika'),
        ]
    )]
    public function playerIndex(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $teamIds = TeamMember::where('user_id', $user->id)
            ->where('status', 'approved')
            ->pluck('team_id')
            ->toArray();

        if (empty($teamIds)) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'total' => 0,
                    'per_page' => max(1, (int) $request->input('per_page', 10)),
                    'current_page' => max(1, (int) $request->input('page', 1)),
                    'last_page' => 1,
                ],
            ], 200);
        }

        return $this->listPlayerEvents($request, $teamIds);
    }

    #[OA\Get(
        path: '/api/player/events/{id}',
        summary: 'Szczegóły wydarzenia (zawodnik)',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wydarzenie pobrane'),
            new OA\Response(response: 403, description: 'Brak uprawnień'),
            new OA\Response(response: 404, description: 'Nie znaleziono'),
        ]
    )]
    public function playerShow(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->playerCanViewEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        $event = $this->baseEventQuery($user->id)
            ->where('training_sessions.id', $id)
            ->first();

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $event = $this->loadExercisesForEvent($event);

        return response()->json(['event' => $event], 200);
    }

    // -------------------------------------------------------------------------
    // Shared logic
    // -------------------------------------------------------------------------

    private function listEvents(Request $request, ?string $coachId = null)
    {
        $perPage = max(1, (int) $request->input('per_page', 10));
        $page = max(1, (int) $request->input('page', 1));

        $search = $request->input('search');
        $teamId = $request->input('team_id');
        $eventType = $request->input('event_type');

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sortColumns = [
            'scheduled_at' => 'training_sessions.scheduled_at',
            'created_at' => 'training_sessions.created_at',
            'duration_minutes' => 'training_sessions.duration_minutes',
            'title' => 'training_sessions.title',
            'event_type' => 'training_sessions.event_type',
        ];
        $sortColumn = $sortColumns[$sortBy] ?? $sortColumns['created_at'];

        $baseQuery = $this->baseEventQuery();

        if ($coachId !== null) {
            $baseQuery->where('teams.coach_id', $coachId);
        }

        if (!empty($teamId)) {
            $baseQuery->where('training_sessions.team_id', $teamId);
        }

        if (!empty($eventType) && in_array($eventType, self::EVENT_TYPES, true)) {
            $baseQuery->where('training_sessions.event_type', $eventType);
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

    private function createEvent(Request $request, ?array $prevalidated = null)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $validatedData = $prevalidated ?? $this->validateEventPayload($request, true);
        if ($validatedData instanceof \Illuminate\Http\JsonResponse) {
            return $validatedData;
        }

        $event = TrainingSession::create([
            'team_id' => $validatedData['team_id'],
            'created_by' => $user->id,
            'event_type' => $validatedData['event_type'],
            'title' => $validatedData['title'],
            'description' => $validatedData['description'] ?? null,
            'scheduled_at' => $validatedData['scheduled_at'],
            'duration_minutes' => $validatedData['duration_minutes'],
            'canvas_data' => $validatedData['canvas_data'] ?? null,
            'google_event_id' => $validatedData['google_event_id'] ?? null,
        ]);
        $id = $event->id;

        // Save exercises if present
        if (isset($validatedData['exercises'])) {
            foreach ($validatedData['exercises'] as $ex) {
                DB::table('training_exercises')->insert([
                    'id' => Str::uuid()->toString(),
                    'training_id' => $id,
                    'name' => $ex['name'],
                    'description' => $ex['description'] ?? null,
                    'canvas_schema' => $ex['canvas_schema'] ?? null,
                    'order_index' => $ex['order_index'],
                    'tools_count' => $ex['tools_count'] ?? 0,
                ]);
            }
        }

        $event = $this->findEventById($id);

        return response()->json([
            'message' => 'Event created successfully.',
            'event' => $event,
        ], 201);
    }

    private function getEvent($id)
    {
        $event = $this->findEventById($id);

        if (!$event) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        return response()->json(['event' => $event], 200);
    }

    private function updateEvent(Request $request, $id, ?array $prevalidated = null)
    {
        $eventModel = TrainingSession::find($id);
        if (!$eventModel) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $validatedData = $prevalidated ?? $this->validateEventPayload($request, false);
        if ($validatedData instanceof \Illuminate\Http\JsonResponse) {
            return $validatedData;
        }

        if (empty($validatedData)) {
            return response()->json(['message' => 'No valid fields to update.'], 422);
        }

        $updateData = collect($validatedData)->except(['exercises'])->toArray();
        $eventModel->update($updateData);

        if (isset($validatedData['exercises'])) {
            // Delete old exercises
            DB::table('training_exercises')->where('training_id', $id)->delete();
            // Insert new exercises
            foreach ($validatedData['exercises'] as $ex) {
                DB::table('training_exercises')->insert([
                    'id' => Str::uuid()->toString(),
                    'training_id' => $id,
                    'name' => $ex['name'],
                    'description' => $ex['description'] ?? null,
                    'canvas_schema' => $ex['canvas_schema'] ?? null,
                    'order_index' => $ex['order_index'],
                    'tools_count' => $ex['tools_count'] ?? 0,
                ]);
            }
        }

        $event = $this->findEventById($id);

        return response()->json([
            'message' => 'Event updated successfully.',
            'event' => $event,
        ], 200);
    }

    private function deleteEvent($id)
    {
        $eventModel = TrainingSession::find($id);
        if (!$eventModel) {
            return response()->json(['message' => 'Event not found.'], 404);
        }

        $eventModel->delete();

        return response()->json(['message' => 'Event deleted successfully.'], 200);
    }

    private function validateEventPayload(Request $request, bool $isCreate)
    {
        if ($isCreate) {
            return $request->validate([
                'team_id' => ['required', 'uuid', 'exists:teams,id'],
                'event_type' => ['required', 'string', 'in:' . implode(',', self::EVENT_TYPES)],
                'title' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'scheduled_at' => ['required', 'date'],
                'duration_minutes' => ['required', 'integer', 'min:1'],
                'canvas_data' => ['nullable', 'string'],
                'google_event_id' => ['nullable', 'string'],
                'exercises' => ['nullable', 'array'],
                'exercises.*.name' => ['required', 'string', 'max:255'],
                'exercises.*.description' => ['nullable', 'string'],
                'exercises.*.canvas_schema' => ['nullable', 'string'],
                'exercises.*.order_index' => ['required', 'integer'],
                'exercises.*.tools_count' => ['nullable', 'integer'],
            ]);
        }

        return $request->validate([
            'team_id' => ['sometimes', 'required', 'uuid', 'exists:teams,id'],
            'event_type' => ['sometimes', 'required', 'string', 'in:' . implode(',', self::EVENT_TYPES)],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'scheduled_at' => ['sometimes', 'required', 'date'],
            'duration_minutes' => ['sometimes', 'required', 'integer', 'min:1'],
            'canvas_data' => ['sometimes', 'nullable', 'string'],
            'google_event_id' => ['sometimes', 'nullable', 'string'],
            'exercises' => ['nullable', 'array'],
            'exercises.*.name' => ['required', 'string', 'max:255'],
            'exercises.*.description' => ['nullable', 'string'],
            'exercises.*.canvas_schema' => ['nullable', 'string'],
            'exercises.*.order_index' => ['required', 'integer'],
            'exercises.*.tools_count' => ['nullable', 'integer'],
        ]);
    }

    private function baseEventQuery(?string $playerId = null)
    {
        $query = TrainingSession::join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->join('users', 'users.id', '=', 'training_sessions.created_by');

        $selects = [
            'training_sessions.*',
            'teams.name as team_name',
            'users.first_name as coach_first_name',
            'users.last_name as coach_last_name',
            'users.email as coach_email',
            'users.role as coach_role',
        ];

        if ($playerId !== null) {
            $query->leftJoin('attendance', function ($join) use ($playerId) {
                $join->on('attendance.training_id', '=', 'training_sessions.id')
                     ->where('attendance.user_id', '=', $playerId);
            });
            $selects[] = 'attendance.status as attendance_status';
            $selects[] = 'attendance.note as attendance_note';
            $selects[] = 'attendance.responded_at as attendance_responded_at';

            $query->leftJoin('fatigue_ratings', function ($join) use ($playerId) {
                $join->on('fatigue_ratings.training_id', '=', 'training_sessions.id')
                     ->where('fatigue_ratings.user_id', '=', $playerId);
            });
            $selects[] = 'fatigue_ratings.rating as player_fatigue_rating';
            $selects[] = 'fatigue_ratings.submitted_at as player_fatigue_submitted_at';
        }

        return $query->select($selects);
    }

    private function loadExercisesForEvent($event)
    {
        if ($event) {
            $event->exercises = DB::table('training_exercises')
                ->where('training_id', $event->id)
                ->orderBy('order_index', 'asc')
                ->get();
        }
        return $event;
    }

    private function findEventById(string $id)
    {
        $event = $this->baseEventQuery()
            ->where('training_sessions.id', $id)
            ->first();

        return $this->loadExercisesForEvent($event);
    }

    private function coachOwnsTeam(string $coachId, string $teamId): bool
    {
        return Team::where('id', $teamId)
            ->where('coach_id', $coachId)
            ->exists();
    }

    private function coachOwnsEvent(string $coachId, string $eventId): bool
    {
        return TrainingSession::join('teams', 'teams.id', '=', 'training_sessions.team_id')
            ->where('training_sessions.id', $eventId)
            ->where('teams.coach_id', $coachId)
            ->exists();
    }

    private function listPlayerEvents(Request $request, array $teamIds)
    {
        $perPage = max(1, (int) $request->input('per_page', 10));
        $page = max(1, (int) $request->input('page', 1));

        $search = $request->input('search');
        $eventType = $request->input('event_type');

        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $sortColumns = [
            'scheduled_at' => 'training_sessions.scheduled_at',
            'created_at' => 'training_sessions.created_at',
            'duration_minutes' => 'training_sessions.duration_minutes',
            'title' => 'training_sessions.title',
            'event_type' => 'training_sessions.event_type',
        ];
        $sortColumn = $sortColumns[$sortBy] ?? $sortColumns['created_at'];

        $baseQuery = $this->baseEventQuery($request->user()->id)
            ->whereIn('training_sessions.team_id', $teamIds);

        if (!empty($eventType) && in_array($eventType, self::EVENT_TYPES, true)) {
            $baseQuery->where('training_sessions.event_type', $eventType);
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

    private function playerCanViewEvent(string $userId, string $eventId): bool
    {
        $event = TrainingSession::find($eventId);
        if (!$event) {
            return false;
        }

        return TeamMember::where('team_id', $event->team_id)
            ->where('user_id', $userId)
            ->where('status', 'approved')
            ->exists();
    }

    #[OA\Post(
        path: '/api/player/events/{id}/attendance',
        summary: 'Deklaruj obecność w wydarzeniu (zawodnik)',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['status'],
                properties: [
                    new OA\Property(property: 'status', type: 'string', enum: ['obecny', 'nieobecny']),
                    new OA\Property(property: 'note', type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Zadeklarowano obecność'),
            new OA\Response(response: 403, description: 'Brak uprawnień'),
            new OA\Response(response: 404, description: 'Nie znaleziono wydarzenia'),
        ]
    )]
    public function playerDeclareAttendance(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->playerCanViewEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:obecny,nieobecny'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $existing = Attendance::where('training_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            $existing->update([
                'status' => $validated['status'],
                'note' => $validated['note'] ?? null,
                'responded_at' => now(),
            ]);
        } else {
            Attendance::create([
                'training_id' => $id,
                'user_id' => $user->id,
                'status' => $validated['status'],
                'note' => $validated['note'] ?? null,
                'responded_at' => now(),
            ]);
        }

        // Return updated event with attendance
        $event = $this->baseEventQuery($user->id)
            ->where('training_sessions.id', $id)
            ->first();

        return response()->json([
            'message' => 'Zadeklarowano obecność pomyślnie.',
            'event' => $event,
        ], 200);
    }

    #[OA\Post(
        path: '/api/player/events/{id}/fatigue',
        summary: 'Zgłoś subiektywną ocenę zmęczenia po wydarzeniu (zawodnik)',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['rating'],
                properties: [
                    new OA\Property(property: 'rating', type: 'integer', minimum: 1, maximum: 10)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Zgłoszono zmęczenie'),
            new OA\Response(response: 403, description: 'Brak uprawnień'),
            new OA\Response(response: 404, description: 'Nie znaleziono wydarzenia'),
        ]
    )]
    public function playerDeclareFatigue(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->playerCanViewEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:10'],
        ]);

        $existing = FatigueRating::where('training_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            $existing->update([
                'rating' => $validated['rating'],
                'submitted_at' => now(),
            ]);
        } else {
            FatigueRating::create([
                'training_id' => $id,
                'user_id' => $user->id,
                'rating' => $validated['rating'],
                'submitted_at' => now(),
            ]);
        }

        // Return updated event with fatigue rating and attendance
        $event = $this->baseEventQuery($user->id)
            ->where('training_sessions.id', $id)
            ->first();

        return response()->json([
            'message' => 'Oceniono zmęczenie pomyślnie.',
            'event' => $event,
        ], 200);
    }

    /**
     * Get attendance list for coach.
     */
    public function coachGetAttendance(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        $event = TrainingSession::findOrFail($id);

        // Fetch team players
        $teamMembers = TeamMember::query()
            ->where('team_id', $event->team_id)
            ->where('status', TeamMember::STATUS_APPROVED)
            ->with('user:id,first_name,last_name,email,avatar_url')
            ->get();

        // Fetch attendance records
        $attendance = Attendance::query()
            ->where('training_id', $id)
            ->get()
            ->keyBy('user_id');

        $data = $teamMembers->map(function ($member) use ($attendance) {
            $player = $member->user;
            if (!$player) return null;

            $att = $attendance->get($player->id);

            return [
                'user_id' => $player->id,
                'first_name' => $player->first_name,
                'last_name' => $player->last_name,
                'email' => $player->email,
                'avatar_url' => $player->avatar_url,
                'status' => $att ? $att->status : null,
                'note' => $att ? $att->note : null,
                'responded_at' => $att ? $att->responded_at : null,
            ];
        })->filter()->values();

        return response()->json([
            'attendance' => $data
        ]);
    }

    /**
     * Save/override player attendance status by coach.
     */
    public function coachSaveAttendance(Request $request, $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        if (!$this->coachOwnsEvent($user->id, $id)) {
            return response()->json(['message' => 'Nie masz uprawnień do tego wydarzenia.'], 403);
        }

        $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'status' => 'required|string|in:obecny,nieobecny,unanswered',
            'note' => 'nullable|string|max:500',
        ]);

        $event = TrainingSession::findOrFail($id);
        $userId = $request->input('user_id');
        $status = $request->input('status');
        $note = $request->input('note');

        // Check if player is in the team
        $isMember = TeamMember::query()
            ->where('team_id', $event->team_id)
            ->where('user_id', $userId)
            ->where('status', TeamMember::STATUS_APPROVED)
            ->exists();

        if (!$isMember) {
            return response()->json(['message' => 'Ten zawodnik nie należy do drużyny przypisanej do tego wydarzenia.'], 422);
        }

        if ($status === 'unanswered') {
            Attendance::query()
                ->where('training_id', $id)
                ->where('user_id', $userId)
                ->delete();
        } else {
            $existing = Attendance::query()
                ->where('training_id', $id)
                ->where('user_id', $userId)
                ->first();

            if ($existing) {
                $existing->update([
                    'status' => $status,
                    'note' => $note,
                    'responded_at' => now(),
                ]);
            } else {
                Attendance::query()->create([
                    'training_id' => $id,
                    'user_id' => $userId,
                    'status' => $status,
                    'note' => $note,
                    'responded_at' => now(),
                ]);
            }
        }

        return response()->json(['message' => 'Zapisano obecność zawodnika pomyślnie.']);
    }
}


