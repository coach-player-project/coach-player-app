<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use OpenApi\Attributes as OA;

class AdminController extends Controller
{
    /**
     * Assign a specific role to a user.
     * Only accessible by admins.
     */
    #[OA\Put(
        path: '/api/admin/users/{id}/role',
        summary: 'Zmień rolę użytkownika',
        description: 'Pozwala administratorowi zmienić rolę dowolnego użytkownika (admin, coach, player)',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID użytkownika', schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/x-www-form-urlencoded',
                schema: new OA\Schema(
                    required: ['role'],
                    properties: [
                        new OA\Property(property: 'role', type: 'string', enum: ['admin', 'coach', 'player'])
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Rola pomyślnie zmieniona'),
            new OA\Response(response: 404, description: 'Nie znaleziono użytkownika')
        ]
    )]
    public function assignRole(Request $request, string $id)
    {
        $validatedData = $request->validate([
            'role' => ['required', 'string', 'in:admin,coach,player']
        ]);

        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Nie znaleziono użytkownika o podanym ID.'
            ], 404);
        }

        $user->role = $validatedData['role'];
        $user->save();

        return response()->json([
            'message' => 'Role została pomyślnie zmieniona.',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ], 200);
    }

    #[OA\Get(
        path: '/api/admin/users',
        summary: 'Lista użytkowników (admin)',
        description: 'Zwraca listę wszystkich użytkowników z możliwością filtrowania po roli, wyszukiwania i paginacji.',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'role', in: 'query', required: false, schema: new OA\Schema(type: 'string', enum: ['admin', 'coach', 'player'])),
            new OA\Parameter(name: 'search', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 10)),
            new OA\Parameter(name: 'page', in: 'query', required: false, schema: new OA\Schema(type: 'integer', default: 1)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista użytkowników pobrana pomyślnie')
        ]
    )]
    public function index(Request $request)
    {
        $role = $request->input('role');
        $search = $request->input('search');

        $query = User::query();

        if (!empty($role)) {
            $query->where('role', $role);
        }

        if (!empty($search)) {
            $searchLike = '%' . $search . '%';
            $query->where(function ($q) use ($searchLike) {
                $q->where('first_name', 'like', $searchLike)
                  ->orWhere('last_name', 'like', $searchLike)
                  ->orWhere('email', 'like', $searchLike);
            });
        }

        // Support returning all users without pagination if all=1 or paginate=0
        if ($request->input('all') || $request->input('paginate') === '0') {
            $users = $query->orderBy('created_at', 'desc')->get();
            return response()->json([
                'data' => $users,
                'total' => $users->count(),
            ], 200);
        }

        $perPage = max(1, (int) $request->input('per_page', 10));
        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
        ], 200);
    }

    /**
     * Create a new user.
     * Only accessible by admins.
     */
    #[OA\Post(
        path: '/api/admin/users',
        summary: 'Utwórz nowego użytkownika',
        description: 'Tworzy nowego użytkownika z podaną rolą (admin, coach, player)',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/json',
                schema: new OA\Schema(
                    required: ['first_name', 'last_name', 'email', 'role', 'password'],
                    properties: [
                        new OA\Property(property: 'first_name', type: 'string'),
                        new OA\Property(property: 'last_name', type: 'string'),
                        new OA\Property(property: 'email', type: 'string', format: 'email'),
                        new OA\Property(property: 'phone', type: 'string', nullable: true),
                        new OA\Property(property: 'role', type: 'string', enum: ['admin', 'coach', 'player']),
                        new OA\Property(property: 'password', type: 'string', minLength: 8)
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Użytkownik zarejestrowany pomyślnie'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych')
        ]
    )]
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', 'string', 'in:admin,coach,player'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'password_hash' => \Illuminate\Support\Facades\Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Użytkownik został pomyślnie utworzony.',
            'user' => $user
        ], 201);
    }

    /**
     * Display the specified user.
     */
    #[OA\Get(
        path: '/api/admin/users/{id}',
        summary: 'Pobierz szczegóły użytkownika',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID użytkownika', schema: new OA\Schema(type: 'string'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Dane użytkownika pobrane pomyślnie'),
            new OA\Response(response: 404, description: 'Nie znaleziono użytkownika')
        ]
    )]
    public function show(string $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Nie znaleziono użytkownika o podanym ID.'
            ], 404);
        }

        return response()->json($user, 200);
    }

    /**
     * Update the specified user.
     */
    #[OA\Put(
        path: '/api/admin/users/{id}',
        summary: 'Aktualizuj dane użytkownika',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID użytkownika', schema: new OA\Schema(type: 'string'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/json',
                schema: new OA\Schema(
                    required: ['first_name', 'last_name', 'email', 'role'],
                    properties: [
                        new OA\Property(property: 'first_name', type: 'string'),
                        new OA\Property(property: 'last_name', type: 'string'),
                        new OA\Property(property: 'email', type: 'string', format: 'email'),
                        new OA\Property(property: 'phone', type: 'string', nullable: true),
                        new OA\Property(property: 'role', type: 'string', enum: ['admin', 'coach', 'player']),
                        new OA\Property(property: 'password', type: 'string', minLength: 8, nullable: true)
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Dane zaktualizowane pomyślnie'),
            new OA\Response(response: 400, description: 'Nieprawidłowe żądanie'),
            new OA\Response(response: 404, description: 'Nie znaleziono użytkownika')
        ]
    )]
    public function update(Request $request, string $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Nie znaleziono użytkownika o podanym ID.'
            ], 404);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . $id],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', 'string', 'in:admin,coach,player'],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        // Prevent admin from changing their own role to non-admin
        $currentUser = $request->user();
        if ($currentUser && $user->id === $currentUser->id && $validated['role'] !== 'admin') {
            return response()->json([
                'message' => 'Nie możesz odebrać sobie uprawnień administratora.'
            ], 400);
        }

        $user->first_name = $validated['first_name'];
        $user->last_name = $validated['last_name'];
        $user->email = $validated['email'];
        $user->phone = $validated['phone'] ?? null;
        $user->role = $validated['role'];

        if (!empty($validated['password'])) {
            $user->password_hash = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'Dane użytkownika zostały pomyślnie zaktualizowane.',
            'user' => $user
        ], 200);
    }

    /**
     * Delete the specified user.
     */
    #[OA\Delete(
        path: '/api/admin/users/{id}',
        summary: 'Usuń użytkownika',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, description: 'ID użytkownika', schema: new OA\Schema(type: 'string'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Użytkownik usunięty pomyślnie'),
            new OA\Response(response: 403, description: 'Brak uprawnień do usunięcia własnego konta'),
            new OA\Response(response: 404, description: 'Nie znaleziono użytkownika')
        ]
    )]
    public function destroy(Request $request, string $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'Nie znaleziono użytkownika o podanym ID.'
            ], 404);
        }

        // Prevent self-deletion
        $currentUser = $request->user();
        if ($currentUser && $user->id === $currentUser->id) {
            return response()->json([
                'message' => 'Nie możesz usunąć własnego konta administratora.'
            ], 403);
        }

        $user->delete();

        return response()->json([
            'message' => 'Użytkownik został pomyślnie usunięty.'
        ], 200);
    }
}

