<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class TeamController extends Controller
{
    /**
     * Display a listing of the teams for unauthenticated users with SFP support.
     */
    #[OA\Get(
        path: '/api/teams',
        summary: 'Pobierz listę drużyn',
        description: 'Pobiera listę drużyn z obsługą paginacji, sortowania i wyszukiwania.',
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Szukana fraza', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sort_by', in: 'query', description: 'Sortowanie wg pola', required: false, schema: new OA\Schema(type: 'string', default: 'created_at')),
            new OA\Parameter(name: 'sort_dir', in: 'query', description: 'Kierunek sortowania (asc/desc)', required: false, schema: new OA\Schema(type: 'string', default: 'desc')),
            new OA\Parameter(name: 'per_page', in: 'query', description: 'Ilość wyników na stronę', required: false, schema: new OA\Schema(type: 'integer', default: 10))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista drużyn pomyślnie pobrana')
        ]
    )]
    public function index(Request $request)
    {
        $query = Team::query();

        // Search by name or description
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at'); // default sort
        $sortDir = $request->input('sort_dir', 'desc'); // default direction

        $allowedSorts = ['name', 'created_at'];

        if (in_array($sortBy, $allowedSorts)) {
            $sortDir = strtolower($sortDir) === 'asc' ? 'asc' : 'desc';
            $query->orderBy($sortBy, $sortDir);
        }

        // Eager load coach details to display who coaches the team
        $query->with(['coach' => function ($q) {
            $q->select('id', 'first_name', 'last_name', 'email');
        }]);

        // Pagination
        $perPage = $request->input('per_page', 10);
        
        $teams = $query->paginate($perPage);

        return response()->json($teams);
    }

    /**
     * Display listing of teams for admin panel.
     */
    public function adminIndex(Request $request)
    {
        return $this->index($request);
    }

    /**
     * Store a newly created team.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'coach_id' => ['required', 'uuid', 'exists:users,id'],
        ]);

        $coach = User::query()
            ->where('id', $validatedData['coach_id'])
            ->where('role', 'coach')
            ->first();

        if (!$coach) {
            return response()->json(['message' => 'Wybrany użytkownik nie jest trenerem.'], 422);
        }

        $team = Team::query()->create($validatedData);
        $team->load(['coach:id,first_name,last_name,email']);

        return response()->json([
            'message' => 'Team created successfully.',
            'team' => $team,
        ], 201);
    }

    /**
     * Display the specified team.
     */
    public function show(string $id)
    {
        $team = Team::query()
            ->with(['coach:id,first_name,last_name,email'])
            ->find($id);

        if (!$team) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        return response()->json(['team' => $team], 200);
    }

    /**
     * Update the specified team.
     */
    public function update(Request $request, string $id)
    {
        $team = Team::query()->find($id);
        if (!$team) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        $validatedData = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'coach_id' => ['sometimes', 'required', 'uuid', 'exists:users,id'],
        ]);

        if (array_key_exists('coach_id', $validatedData)) {
            $coach = User::query()
                ->where('id', $validatedData['coach_id'])
                ->where('role', 'coach')
                ->first();

            if (!$coach) {
                return response()->json(['message' => 'Wybrany użytkownik nie jest trenerem.'], 422);
            }
        }

        $team->update($validatedData);
        $team->load(['coach:id,first_name,last_name,email']);

        return response()->json([
            'message' => 'Team updated successfully.',
            'team' => $team,
        ], 200);
    }

    /**
     * Remove the specified team.
     */
    public function destroy(string $id)
    {
        $deleted = Team::query()->where('id', $id)->delete();
        if ($deleted === 0) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        return response()->json(['message' => 'Team deleted successfully.'], 200);
    }

    /**
     * Return available coaches for team assignment.
     */
    public function coaches()
    {
        $coaches = User::query()
            ->select(['id', 'first_name', 'last_name', 'email'])
            ->where('role', 'coach')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json(['data' => $coaches], 200);
    }
}
