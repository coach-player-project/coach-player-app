<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\FatigueRating;
use App\Models\TrainingSession;
use OpenApi\Attributes as OA;

class FatigueRatingController extends Controller
{
    #[OA\Get(
        path: '/api/admin/fatigue-ratings',
        summary: 'Lista ocen zmęczenia (admin)',
        description: 'Zwraca listę ocen zmęczenia zawodników z możliwością filtrowania, sortowania i paginacji.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'user_id', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'uuid')),
            new OA\Parameter(name: 'training_id', in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'uuid')),
            new OA\Parameter(name: 'sort_by', in: 'query', required: false, schema: new OA\Schema(type: 'string', default: 'submitted_at')),
            new OA\Parameter(name: 'sort_dir', in: 'query', required: false, schema: new OA\Schema(type: 'string', default: 'desc')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista ocen została pobrana pomyślnie'),
        ]
    )]
    public function index(Request $request)
    {
        $perPage = max(1, (int) $request->input('per_page', 10));
        $search = $request->input('search');
        $userId = $request->input('user_id');
        $trainingId = $request->input('training_id');

        $sortBy = $request->input('sort_by', 'submitted_at');
        $sortDir = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        $query = FatigueRating::with(['user', 'trainingSession']);

        if (!empty($userId)) {
            $query->where('user_id', $userId);
        }

        if (!empty($trainingId)) {
            $query->where('training_id', $trainingId);
        }

        if (!empty($search)) {
            $searchLike = '%' . $search . '%';
            $query->where(function ($q) use ($searchLike) {
                $q->whereHas('user', function ($uq) use ($searchLike) {
                    $uq->where('first_name', 'like', $searchLike)
                       ->orWhere('last_name', 'like', $searchLike)
                       ->orWhere('email', 'like', $searchLike);
                })->orWhereHas('trainingSession', function ($tq) use ($searchLike) {
                    $tq->where('title', 'like', $searchLike);
                });
            });
        }

        // Sortowanie
        if ($sortBy === 'rating') {
            $query->orderBy('rating', $sortDir);
        } else {
            $query->orderBy('submitted_at', $sortDir);
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'total' => $paginated->total(),
                'per_page' => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
            ],
        ], 200);
    }

    #[OA\Post(
        path: '/api/admin/fatigue-ratings',
        summary: 'Utwórz nową ocenę zmęczenia (admin)',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['training_id', 'user_id', 'rating'],
                properties: [
                    new OA\Property(property: 'training_id', type: 'string', format: 'uuid'),
                    new OA\Property(property: 'user_id', type: 'string', format: 'uuid'),
                    new OA\Property(property: 'rating', type: 'integer', minimum: 1, maximum: 10),
                    new OA\Property(property: 'submitted_at', type: 'string', format: 'date-time', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Ocena została utworzona pomyślnie'),
        ]
    )]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'training_id' => ['required', 'uuid', 'exists:training_sessions,id'],
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:10'],
            'submitted_at' => ['nullable', 'date'],
        ]);

        if (empty($validated['submitted_at'])) {
            $validated['submitted_at'] = now();
        }

        $fatigueRating = FatigueRating::create($validated);
        $fatigueRating->load(['user', 'trainingSession']);

        return response()->json([
            'message' => 'Ocena zmęczenia została dodana.',
            'data' => $fatigueRating,
        ], 201);
    }

    #[OA\Get(
        path: '/api/admin/fatigue-ratings/{id}',
        summary: 'Pobierz szczegóły oceny zmęczenia (admin)',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Ocena pobrana pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono oceny'),
        ]
    )]
    public function show($id)
    {
        $fatigueRating = FatigueRating::with(['user', 'trainingSession'])->find($id);

        if (!$fatigueRating) {
            return response()->json(['message' => 'Nie znaleziono oceny zmęczenia.'], 404);
        }

        return response()->json(['data' => $fatigueRating], 200);
    }

    #[OA\Put(
        path: '/api/admin/fatigue-ratings/{id}',
        summary: 'Zaktualizuj ocenę zmęczenia (admin)',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'training_id', type: 'string', format: 'uuid'),
                    new OA\Property(property: 'user_id', type: 'string', format: 'uuid'),
                    new OA\Property(property: 'rating', type: 'integer', minimum: 1, maximum: 10),
                    new OA\Property(property: 'submitted_at', type: 'string', format: 'date-time'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Ocena zaktualizowana pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono oceny'),
        ]
    )]
    public function update(Request $request, $id)
    {
        $fatigueRating = FatigueRating::find($id);

        if (!$fatigueRating) {
            return response()->json(['message' => 'Nie znaleziono oceny zmęczenia.'], 404);
        }

        $validated = $request->validate([
            'training_id' => ['sometimes', 'required', 'uuid', 'exists:training_sessions,id'],
            'user_id' => ['sometimes', 'required', 'uuid', 'exists:users,id'],
            'rating' => ['sometimes', 'required', 'integer', 'min:1', 'max:10'],
            'submitted_at' => ['sometimes', 'required', 'date'],
        ]);

        $fatigueRating->update($validated);
        $fatigueRating->load(['user', 'trainingSession']);

        return response()->json([
            'message' => 'Ocena zmęczenia została zaktualizowana.',
            'data' => $fatigueRating,
        ], 200);
    }

    #[OA\Delete(
        path: '/api/admin/fatigue-ratings/{id}',
        summary: 'Usuń ocenę zmęczenia (admin)',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string', format: 'uuid')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Ocena usunięta pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono oceny'),
        ]
    )]
    public function destroy($id)
    {
        $fatigueRating = FatigueRating::find($id);

        if (!$fatigueRating) {
            return response()->json(['message' => 'Nie znaleziono oceny zmęczenia.'], 404);
        }

        $fatigueRating->delete();

        return response()->json(['message' => 'Ocena zmęczenia została usunięta.'], 200);
    }

    /**
     * Zwraca oceny zmęczenia zawodników drużyn danego trenera.
     * Trener widzi TYLKO oceny ze swoich drużyn.
     */
    public function coachIndex(Request $request)
    {
        $coach = $request->user();
        if (!$coach) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $perPage  = max(1, (int) $request->input('per_page', 15));
        $search   = $request->input('search');
        $trainingId = $request->input('training_id');
        $sortDir  = strtolower($request->input('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        // Pobierz IDs treningów z drużyn należących do trenera
        $trainingIds = TrainingSession::whereHas('team.coaches', function ($q) use ($coach) {
            $q->where('users.id', $coach->id);
        })->pluck('id');

        $query = FatigueRating::with(['user', 'trainingSession.team'])
            ->whereIn('training_id', $trainingIds);

        if (!empty($trainingId)) {
            $query->where('training_id', $trainingId);
        }

        if (!empty($search)) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->whereHas('user', fn($uq) => $uq
                    ->where('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('email', 'like', $like)
                )->orWhereHas('trainingSession', fn($tq) => $tq
                    ->where('title', 'like', $like)
                );
            });
        }

        $paginated = $query->orderBy('submitted_at', $sortDir)->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'total'        => $paginated->total(),
                'per_page'     => $paginated->perPage(),
                'current_page' => $paginated->currentPage(),
                'last_page'    => $paginated->lastPage(),
            ],
        ], 200);
    }
}

