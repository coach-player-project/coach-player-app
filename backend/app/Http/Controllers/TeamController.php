<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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

        // Eager load coaches details to display who coaches the team
        $query->with(['coaches' => function ($q) {
            $q->select('users.id', 'first_name', 'last_name', 'email');
        }]);

        // Pagination
        $perPage = $request->input('per_page', 10);
        
        $teams = $query->paginate($perPage);

        return response()->json($teams);
    }

    /**
     * Display listing of teams for admin panel.
     */
    #[OA\Get(
        path: '/api/admin/teams',
        summary: 'Lista drużyn (admin)',
        description: 'Pobiera listę drużyn dla panelu administratora z obsługą paginacji, sortowania i wyszukiwania.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search', in: 'query', description: 'Szukana fraza', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sort_by', in: 'query', description: 'Sortowanie wg pola', required: false, schema: new OA\Schema(type: 'string', default: 'created_at')),
            new OA\Parameter(name: 'sort_dir', in: 'query', description: 'Kierunek sortowania (asc/desc)', required: false, schema: new OA\Schema(type: 'string', default: 'desc')),
            new OA\Parameter(name: 'per_page', in: 'query', description: 'Ilość wyników na stronę', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
            new OA\Parameter(name: 'page', in: 'query', description: 'Numer strony', required: false, schema: new OA\Schema(type: 'integer', default: 1))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista drużyn pomyślnie pobrana'),
            new OA\Response(response: 401, description: 'Brak autoryzacji')
        ]
    )]
    public function adminIndex(Request $request)
    {
        return $this->index($request);
    }

    /**
     * Store a newly created team.
     */
    #[OA\Post(
        path: '/api/admin/teams',
        summary: 'Utwórz nową drużynę',
        description: 'Tworzy nową drużynę i przypisuje do niej trenera.',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/json',
                schema: new OA\Schema(
                    required: ['name', 'coach_id'],
                    properties: [
                        new OA\Property(property: 'name', type: 'string', maxLength: 255),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'coach_id', type: 'string', format: 'uuid'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Drużyna została utworzona'),
            new OA\Response(response: 401, description: 'Brak autoryzacji'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych')
        ]
    )]
    public function store(Request $request)
    {
        // Normalise single coach_id into coaches array if needed
        if ($request->has('coach_id') && !$request->has('coaches')) {
            $request->merge([
                'coaches' => [
                    [
                        'user_id' => $request->input('coach_id'),
                        'role' => 'Główny trener',
                    ]
                ]
            ]);
        }

        $validatedData = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'coaches' => ['required', 'array'],
            'coaches.*.user_id' => ['required', 'uuid', 'exists:users,id'],
            'coaches.*.role' => ['required', 'string', 'max:255'],
            'logo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
        ]);

        $coachIds = collect($validatedData['coaches'])->pluck('user_id');
        if ($coachIds->duplicates()->isNotEmpty()) {
            return response()->json(['message' => 'Ten sam trener nie może być przypisany do drużyny więcej niż jeden raz.'], 422);
        }

        $headCoachesCount = collect($validatedData['coaches'])->where('role', 'Główny trener')->count();
        if ($headCoachesCount !== 1) {
            return response()->json(['message' => 'Drużyna musi mieć dokładnie jednego Głównego trenera.'], 422);
        }

        foreach ($validatedData['coaches'] as $c) {
            $user = User::query()->find($c['user_id']);
            if (!$user || $user->role !== 'coach') {
                return response()->json(['message' => "Użytkownik o ID {$c['user_id']} nie jest trenerem."], 422);
            }

            if ($c['role'] === 'Główny trener') {
                $alreadyHead = \Illuminate\Support\Facades\DB::table('team_coaches')
                    ->where('user_id', $c['user_id'])
                    ->where('role', 'Główny trener')
                    ->exists();
                if ($alreadyHead) {
                    return response()->json(['message' => "Trener {$user->first_name} {$user->last_name} jest już Głównym trenerem w innej drużynie."], 422);
                }
            }
        }

        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('teams/logos', 'public');
            $validatedData['logo_path'] = $path;
        }

        $team = Team::query()->create([
            'name' => $validatedData['name'],
            'description' => $validatedData['description'] ?? null,
            'logo_path' => $validatedData['logo_path'] ?? null,
        ]);

        foreach ($validatedData['coaches'] as $c) {
            $team->coaches()->attach($c['user_id'], [
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'role' => $c['role'],
            ]);
        }

        $team->load(['coaches:id,first_name,last_name,email']);

        return response()->json([
            'message' => 'Team created successfully.',
            'team' => $team,
        ], 201);
    }

    /**
     * Display the specified team.
     */
    #[OA\Get(
        path: '/api/admin/teams/{id}',
        summary: 'Pobierz szczegóły drużyny',
        description: 'Zwraca pojedynczą drużynę wraz z przypisanym trenerem.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'ID drużyny (UUID)',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Szczegóły drużyny pobrane pomyślnie'),
            new OA\Response(response: 401, description: 'Brak autoryzacji'),
            new OA\Response(response: 404, description: 'Nie znaleziono drużyny')
        ]
    )]
    public function show(string $id)
    {
        $team = Team::query()
            ->with(['coaches:id,first_name,last_name,email'])
            ->find($id);

        if (!$team) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        return response()->json(['team' => $team], 200);
    }

    /**
     * Update the specified team.
     */
    #[OA\Put(
        path: '/api/admin/teams/{id}',
        summary: 'Zaktualizuj drużynę',
        description: 'Aktualizuje dane drużyny i opcjonalnie przypisanego trenera.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'ID drużyny (UUID)',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\MediaType(
                mediaType: 'application/json',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: 'name', type: 'string', maxLength: 255, nullable: true),
                        new OA\Property(property: 'description', type: 'string', nullable: true),
                        new OA\Property(property: 'coach_id', type: 'string', format: 'uuid', nullable: true),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Drużyna została zaktualizowana'),
            new OA\Response(response: 401, description: 'Brak autoryzacji'),
            new OA\Response(response: 404, description: 'Nie znaleziono drużyny'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych')
        ]
    )]
    public function update(Request $request, string $id)
    {
        $team = Team::query()->find($id);
        if (!$team) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        if ($request->has('coach_id') && !$request->has('coaches')) {
            $request->merge([
                'coaches' => [
                    [
                        'user_id' => $request->input('coach_id'),
                        'role' => 'Główny trener',
                    ]
                ]
            ]);
        }

        $validatedData = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'coaches' => ['sometimes', 'required', 'array'],
            'coaches.*.user_id' => ['required', 'uuid', 'exists:users,id'],
            'coaches.*.role' => ['required', 'string', 'max:255'],
            'logo' => ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
        ]);

        if (array_key_exists('coaches', $validatedData)) {
            $coachIds = collect($validatedData['coaches'])->pluck('user_id');
            if ($coachIds->duplicates()->isNotEmpty()) {
                return response()->json(['message' => 'Ten sam trener nie może być przypisany do drużyny więcej niż jeden raz.'], 422);
            }

            $headCoachesCount = collect($validatedData['coaches'])->where('role', 'Główny trener')->count();
            if ($headCoachesCount !== 1) {
                return response()->json(['message' => 'Drużyna musi mieć dokładnie jednego Głównego trenera.'], 422);
            }

            foreach ($validatedData['coaches'] as $c) {
                $user = User::query()->find($c['user_id']);
                if (!$user || $user->role !== 'coach') {
                    return response()->json(['message' => "Użytkownik o ID {$c['user_id']} nie jest trenerem."], 422);
                }

                if ($c['role'] === 'Główny trener') {
                    $alreadyHead = \Illuminate\Support\Facades\DB::table('team_coaches')
                        ->where('user_id', $c['user_id'])
                        ->where('role', 'Główny trener')
                        ->where('team_id', '!=', $id)
                        ->exists();
                    if ($alreadyHead) {
                        return response()->json(['message' => "Trener {$user->first_name} {$user->last_name} jest już Głównym trenerem w innej drużynie."], 422);
                    }
                }
            }
        }

        if ($request->hasFile('logo')) {
            if ($team->logo_path) {
                Storage::disk('public')->delete($team->logo_path);
            }
            $path = $request->file('logo')->store('teams/logos', 'public');
            $validatedData['logo_path'] = $path;
        }

        if ($request->input('remove_logo') == true) {
            if ($team->logo_path) {
                Storage::disk('public')->delete($team->logo_path);
            }
            $validatedData['logo_path'] = null;
        }

        $team->update([
            'name' => $validatedData['name'] ?? $team->name,
            'description' => array_key_exists('description', $validatedData) ? $validatedData['description'] : $team->description,
            'logo_path' => array_key_exists('logo_path', $validatedData) ? $validatedData['logo_path'] : $team->logo_path,
        ]);

        if (array_key_exists('coaches', $validatedData)) {
            $team->coaches()->detach();
            foreach ($validatedData['coaches'] as $c) {
                $team->coaches()->attach($c['user_id'], [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'role' => $c['role'],
                ]);
            }
        }

        $team->load(['coaches:id,first_name,last_name,email']);

        return response()->json([
            'message' => 'Team updated successfully.',
            'team' => $team,
        ], 200);
    }

    /**
     * Remove the specified team.
     */
    #[OA\Delete(
        path: '/api/admin/teams/{id}',
        summary: 'Usuń drużynę',
        description: 'Usuwa drużynę na podstawie jej ID.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                description: 'ID drużyny (UUID)',
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Drużyna została usunięta'),
            new OA\Response(response: 401, description: 'Brak autoryzacji'),
            new OA\Response(response: 404, description: 'Nie znaleziono drużyny')
        ]
    )]
    public function destroy(string $id)
    {
        $team = Team::query()->find($id);
        if (!$team) {
            return response()->json(['message' => 'Team not found.'], 404);
        }

        if ($team->logo_path) {
            Storage::disk('public')->delete($team->logo_path);
        }

        $team->delete();

        return response()->json(['message' => 'Team deleted successfully.'], 200);
    }

    /**
     * Return available coaches for team assignment.
     */
    #[OA\Get(
        path: '/api/admin/teams/coaches',
        summary: 'Lista trenerów do przypisania',
        description: 'Zwraca listę użytkowników z rolą coach do przypisania w drużynie.',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Lista trenerów pobrana pomyślnie'),
            new OA\Response(response: 401, description: 'Brak autoryzacji')
        ]
    )]
    public function coaches(Request $request)
    {
        $query = User::query()->where('role', 'coach');
        $coaches = $query->select(['id', 'first_name', 'last_name', 'email'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json(['data' => $coaches], 200);
    }

    /**
     * Teams assigned to the authenticated coach.
     */
    public function coachIndex(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $query = Team::query()->whereHas('coaches', function ($q) use ($user) {
            $q->where('users.id', $user->id);
        });

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->input('sort_by', 'name');
        $sortDir = strtolower($request->input('sort_dir', 'asc')) === 'desc' ? 'desc' : 'asc';
        $allowedSorts = ['name', 'created_at'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = (int) $request->input('per_page', 100);
        $teams = $query->paginate($perPage > 0 ? $perPage : 100);

        return response()->json($teams);
    }

    /**
     * Get the team's logo. Generates SVG logo dynamically if none is uploaded.
     */
    public function logo(string $id)
    {
        $team = Team::query()->find($id);

        // If team has logo_path and it exists on public disk
        if ($team && $team->logo_path && Storage::disk('public')->exists($team->logo_path)) {
            $file = Storage::disk('public')->get($team->logo_path);
            $mime = Storage::disk('public')->mimeType($team->logo_path);
            return response($file, 200)
                ->header('Content-Type', $mime)
                ->header('Cache-Control', 'public, max-age=60'); // short cache to allow updates
        }

        // Generate beautiful dynamic SVG logo
        $name = $team ? $team->name : 'Drużyna';
        $svg = $this->generateSvgLogo($name, $id);

        return response($svg, 200)
            ->header('Content-Type', 'image/svg+xml')
            ->header('Cache-Control', 'public, max-age=86400');
    }

    /**
     * Helper to generate a beautiful, dynamic SVG crest for a team.
     */
    private function generateSvgLogo(string $name, string $id): string
    {
        // Deterministic seeding based on ID hash
        $hashNum = hexdec(substr(md5($id), 0, 8));

        // 1. Gradients
        $gradients = [
            // 0: Crimson Red & Rose Orange
            ['#e11d48', '#f97316'],
            // 1: Royal Blue & Bright Cyan
            ['#1d4ed8', '#06b6d4'],
            // 2: Deep Emerald & Gold Yellow
            ['#047857', '#eab308'],
            // 3: Electric Indigo & Violet Purple
            ['#4f46e5', '#a855f7'],
            // 4: Sleek Charcoal & Silver Gray
            ['#1f2937', '#6b7280'],
            // 5: Midnight Teal & Mint Green
            ['#0f766e', '#2dd4bf'],
        ];
        $grad = $gradients[$hashNum % count($gradients)];

        // 2. Crest Shape Path
        $shapeNum = hexdec(substr(md5($name), 0, 8)) % 3;
        if ($shapeNum === 0) {
            // Shield
            $bgPath = '<path d="M 60,10 C 85,10 105,15 105,45 C 105,80 80,105 60,115 C 40,105 15,80 15,45 C 15,15 35,10 60,10 Z" fill="url(#grad-'.$id.')" filter="url(#shadow)" />';
            $borderPath = '<path d="M 60,10 C 85,10 105,15 105,45 C 105,80 80,105 60,115 C 40,105 15,80 15,45 C 15,15 35,10 60,10 Z" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" transform="scale(0.88)" transform-origin="60 60" />';
            $clipPath = '<clipPath id="clip-'.$id.'"><path d="M 60,10 C 85,10 105,15 105,45 C 105,80 80,105 60,115 C 40,105 15,80 15,45 C 15,15 35,10 60,10 Z" transform="scale(0.88)" transform-origin="60 60" /></clipPath>';
        } elseif ($shapeNum === 1) {
            // Hexagon
            $bgPath = '<path d="M 60,10 L 105,35 L 105,85 L 60,110 L 15,85 L 15,35 Z" fill="url(#grad-'.$id.')" filter="url(#shadow)" />';
            $borderPath = '<path d="M 60,10 L 105,35 L 105,85 L 60,110 L 15,85 L 15,35 Z" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" transform="scale(0.88)" transform-origin="60 60" />';
            $clipPath = '<clipPath id="clip-'.$id.'"><path d="M 60,10 L 105,35 L 105,85 L 60,110 L 15,85 L 15,35 Z" transform="scale(0.88)" transform-origin="60 60" /></clipPath>';
        } else {
            // Circle
            $bgPath = '<circle cx="60" cy="60" r="50" fill="url(#grad-'.$id.')" filter="url(#shadow)" />';
            $borderPath = '<circle cx="60" cy="60" r="44" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2.5" />';
            $clipPath = '<clipPath id="clip-'.$id.'"><circle cx="60" cy="60" r="44" /></clipPath>';
        }

        // 3. Initials Extraction
        $words = preg_split('/[\s-]+/', trim($name));
        $initials = '';
        if (count($words) >= 2) {
            foreach (array_slice($words, 0, 3) as $w) {
                if (!empty($w)) {
                    $initials .= mb_substr($w, 0, 1);
                }
            }
        } else {
            $initials = mb_substr($name, 0, min(3, mb_strlen($name)));
        }
        $initials = mb_strtoupper($initials);

        // Dynamic Font Size based on Initials Length
        $fontSize = 34;
        if (mb_strlen($initials) === 1) {
            $fontSize = 44;
        } elseif (mb_strlen($initials) === 2) {
            $fontSize = 38;
        } elseif (mb_strlen($initials) >= 3) {
            $fontSize = 30;
        }

        // Decorative stripes/sash selection
        $stripeNum = $hashNum % 3;
        $stripes = '';
        if ($stripeNum === 0) {
            // Elegant diagonal sash
            $stripes = '<path d="M-20,100 L140,-20 L140,5 L-20,125 Z" fill="rgba(255,255,255,0.06)" />
                        <path d="M-20,115 L140,-5 L140,20 L-20,140 Z" fill="rgba(255,255,255,0.03)" />';
        } elseif ($stripeNum === 1) {
            // Elegant vertical stripe
            $stripes = '<rect x="52" y="-10" width="16" height="140" fill="rgba(255,255,255,0.05)" />
                        <rect x="56" y="-10" width="8" height="140" fill="rgba(255,255,255,0.03)" />';
        } else {
            // Elegant horizontal stripe
            $stripes = '<rect x="-10" y="52" width="140" height="16" fill="rgba(255,255,255,0.05)" />
                        <rect x="-10" y="56" width="140" height="8" fill="rgba(255,255,255,0.03)" />';
        }

        // Output SVG string
        return <<<SVG
<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <linearGradient id="grad-{$id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{$grad[0]}" />
      <stop offset="100%" stop-color="{$grad[1]}" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
    {$clipPath}
  </defs>

  <!-- Crest Shape Background -->
  {$bgPath}

  <!-- Stripes inside the crest (masked) -->
  <g clip-path="url(#clip-{$id})">
    {$stripes}
  </g>

  <!-- Inner Border -->
  {$borderPath}

  <!-- Decorative Stars at the top -->
  <g fill="#fbbf24" stroke="none">
    <!-- Star 1 -->
    <path d="M 45,35 L 46.5,38.5 L 50,38.5 L 47.2,40.8 L 48.3,44.3 L 45,42.1 L 41.7,44.3 L 42.8,40.8 L 40,38.5 L 43.5,38.5 Z" opacity="0.85" />
    <!-- Star 2 (Middle, slightly larger and higher) -->
    <path d="M 60,28 L 61.8,32.2 L 66,32.2 L 62.6,35 L 63.9,39.2 L 60,36.6 L 56.1,39.2 L 57.4,35 L 54,32.2 L 58.2,32.2 Z" />
    <!-- Star 3 -->
    <path d="M 75,35 L 76.5,38.5 L 80,38.5 L 77.2,40.8 L 78.3,44.3 L 75,42.1 L 71.7,44.3 L 72.8,40.8 L 70,38.5 L 73.5,38.5 Z" opacity="0.85" />
  </g>

  <!-- Initials Text -->
  <text x="60" y="70" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="{$fontSize}" fill="#ffffff" text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5">{$initials}</text>

  <!-- Decorative Bottom Arch -->
  <path d="M 45,88 Q 60,94 75,88" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round" />
</svg>
SVG;
    }
}
