<?php

namespace App\Http\Controllers;

use App\Models\Team;
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
}
