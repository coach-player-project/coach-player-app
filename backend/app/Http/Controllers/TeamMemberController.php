<?php

namespace App\Http\Controllers;

use App\Models\TeamMember;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class TeamMemberController extends Controller
{
    #[OA\Get(
        path: '/api/admin/team-members',
        summary: 'Lista zgłoszeń do drużyn',
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'status', in: 'query', schema: new OA\Schema(type: 'string', default: 'pending')),
            new OA\Parameter(name: 'per_page', in: 'query', schema: new OA\Schema(type: 'integer', default: 15)),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Lista zgłoszeń'),
        ]
    )]
    public function index(Request $request)
    {
        $status = $request->input('status', TeamMember::STATUS_PENDING);
        $allowedStatuses = [
            TeamMember::STATUS_PENDING,
            TeamMember::STATUS_APPROVED,
            TeamMember::STATUS_REJECTED,
        ];

        if (!in_array($status, $allowedStatuses, true)) {
            $status = TeamMember::STATUS_PENDING;
        }

        $perPage = min((int) $request->input('per_page', 15), 50);

        $members = TeamMember::query()
            ->where('status', $status)
            ->with([
                'team:id,name',
                'user:id,first_name,last_name,email,role,created_at',
            ])
            ->orderByDesc('joined_at')
            ->paginate($perPage);

        return response()->json($members);
    }

    #[OA\Post(
        path: '/api/admin/team-members/{id}/approve',
        summary: 'Zaakceptuj przynależność zawodnika do drużyny',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Zgłoszenie zaakceptowane'),
            new OA\Response(response: 404, description: 'Nie znaleziono zgłoszenia'),
            new OA\Response(response: 422, description: 'Zgłoszenie nie oczekuje na akceptację'),
        ]
    )]
    public function approve(string $id)
    {
        $member = TeamMember::query()->find($id);

        if (!$member) {
            return response()->json(['message' => 'Nie znaleziono zgłoszenia.'], 404);
        }

        if ($member->status !== TeamMember::STATUS_PENDING) {
            return response()->json(['message' => 'To zgłoszenie nie oczekuje na akceptację.'], 422);
        }

        $member->status = TeamMember::STATUS_APPROVED;
        $member->joined_at = now();
        $member->save();

        $member->load(['team:id,name', 'user:id,first_name,last_name,email,role']);

        if ($member->user && $member->user->role === 'coach') {
            \App\Models\Team::where('id', $member->team_id)
                ->update(['coach_id' => $member->user_id]);
        }

        return response()->json([
            'message' => 'Przynależność do drużyny została zaakceptowana.',
            'membership' => $member,
        ]);
    }

    #[OA\Post(
        path: '/api/admin/team-members/{id}/reject',
        summary: 'Odrzuć przynależność zawodnika do drużyny',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Zgłoszenie odrzucone'),
            new OA\Response(response: 404, description: 'Nie znaleziono zgłoszenia'),
            new OA\Response(response: 422, description: 'Zgłoszenie nie oczekuje na akceptację'),
        ]
    )]
    public function reject(string $id)
    {
        $member = TeamMember::query()->find($id);

        if (!$member) {
            return response()->json(['message' => 'Nie znaleziono zgłoszenia.'], 404);
        }

        if ($member->status !== TeamMember::STATUS_PENDING) {
            return response()->json(['message' => 'To zgłoszenie nie oczekuje na akceptację.'], 422);
        }

        $member->status = TeamMember::STATUS_REJECTED;
        $member->save();

        $member->load(['team:id,name', 'user:id,first_name,last_name,email']);

        return response()->json([
            'message' => 'Zgłoszenie do drużyny zostało odrzucone.',
            'membership' => $member,
        ]);
    }
}
