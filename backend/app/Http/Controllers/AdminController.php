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
        $perPage = max(1, (int) $request->input('per_page', 10));

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

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'total' => $paginated->total(),
            'per_page' => $paginated->perPage(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
        ], 200);
    }
}

