<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    /**
     * Get contacts and channels (teams) for the chat interface.
     */
    public function getContacts(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $channels = [];
        $directs = [];

        // Fetch unread direct message counts grouped by sender
        $unreadCounts = Message::query()
            ->where('receiver_id', $user->id)
            ->where('is_read', false)
            ->groupBy('sender_id')
            ->select('sender_id', DB::raw('count(*) as count'))
            ->pluck('count', 'sender_id');

        if ($user->role === 'player') {
            // Player belongs to approved teams
            $teamIds = TeamMember::query()
                ->where('user_id', $user->id)
                ->where('status', TeamMember::STATUS_APPROVED)
                ->pluck('team_id');

            $teams = Team::query()->whereIn('id', $teamIds)->get();

            foreach ($teams as $team) {
                $channels[] = [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => 'Czat grupowy',
                    'type' => 'group',
                    'logo_url' => $team->logo_url,
                ];
            }

            // Coaches of those teams
            $coachIds = \Illuminate\Support\Facades\DB::table('team_coaches')
                ->whereIn('team_id', $teamIds)
                ->pluck('user_id')
                ->filter()
                ->unique();
            $coaches = User::query()
                ->whereIn('id', $coachIds)
                ->get(['id', 'first_name', 'last_name', 'email', 'avatar_url', 'role']);

            foreach ($coaches as $coach) {
                // Find teams the coach coaches that this player is in, along with their roles
                $coachTeamRoles = \Illuminate\Support\Facades\DB::table('team_coaches')
                    ->join('teams', 'teams.id', '=', 'team_coaches.team_id')
                    ->where('team_coaches.user_id', $coach->id)
                    ->whereIn('team_coaches.team_id', $teamIds)
                    ->select('teams.name as team_name', 'team_coaches.role as team_role')
                    ->get();
                
                $roleDescParts = [];
                foreach ($coachTeamRoles as $tr) {
                    $roleName = $tr->team_role ?? 'Trener';
                    $roleDescParts[] = "{$roleName} ({$tr->team_name})";
                }
                $description = implode(', ', $roleDescParts) ?: 'Trener';

                $directs[] = [
                    'id' => $coach->id,
                    'first_name' => $coach->first_name,
                    'last_name' => $coach->last_name,
                    'email' => $coach->email,
                    'role' => 'coach',
                    'description' => $description,
                    'avatar_url' => $coach->avatar_url,
                    'unread_count' => $unreadCounts[$coach->id] ?? 0,
                ];
            }
        } elseif ($user->role === 'coach') {
            // Coach coaches teams
            $teams = Team::query()->whereHas('coaches', function ($q) use ($user) {
                $q->where('users.id', $user->id);
            })->get();
            $teamIds = $teams->pluck('id');

            foreach ($teams as $team) {
                $channels[] = [
                    'id' => $team->id,
                    'name' => $team->name,
                    'description' => 'Czat grupowy',
                    'type' => 'group',
                    'logo_url' => $team->logo_url,
                ];
            }

            // Other coaches of those teams
            $otherCoachRoles = \Illuminate\Support\Facades\DB::table('team_coaches')
                ->join('teams', 'teams.id', '=', 'team_coaches.team_id')
                ->whereIn('team_coaches.team_id', $teamIds)
                ->where('team_coaches.user_id', '!=', $user->id)
                ->select('team_coaches.user_id', 'teams.name as team_name', 'team_coaches.role as team_role')
                ->get();
            
            $coachInfos = [];
            foreach ($otherCoachRoles as $ocr) {
                if (!isset($coachInfos[$ocr->user_id])) {
                    $coachInfos[$ocr->user_id] = [];
                }
                $roleName = $ocr->team_role ?? 'Trener';
                $coachInfos[$ocr->user_id][] = "{$roleName} ({$ocr->team_name})";
            }

            if (!empty($coachInfos)) {
                $coaches = User::query()
                    ->whereIn('id', array_keys($coachInfos))
                    ->get(['id', 'first_name', 'last_name', 'email', 'avatar_url', 'role']);
                
                foreach ($coaches as $coach) {
                    $directs[] = [
                        'id' => $coach->id,
                        'first_name' => $coach->first_name,
                        'last_name' => $coach->last_name,
                        'email' => $coach->email,
                        'role' => 'coach',
                        'description' => implode(', ', $coachInfos[$coach->id]),
                        'avatar_url' => $coach->avatar_url,
                        'unread_count' => $unreadCounts[$coach->id] ?? 0,
                    ];
                }
            }

            // Players of those teams
            $playerMemberships = TeamMember::query()
                ->whereIn('team_id', $teamIds)
                ->where('status', TeamMember::STATUS_APPROVED)
                ->with(['user', 'team'])
                ->get();

            // Group players by user ID to show unique players with their team names
            $playerData = [];
            foreach ($playerMemberships as $membership) {
                $player = $membership->user;
                if (!$player) continue;

                if (!isset($playerData[$player->id])) {
                    $playerData[$player->id] = [
                        'player' => $player,
                        'teams' => [],
                    ];
                }
                $playerData[$player->id]['teams'][] = $membership->team->name;
            }

            foreach ($playerData as $pId => $data) {
                $player = $data['player'];
                $teamsList = implode(', ', $data['teams']);
                $directs[] = [
                    'id' => $player->id,
                    'first_name' => $player->first_name,
                    'last_name' => $player->last_name,
                    'email' => $player->email,
                    'role' => 'player',
                    'description' => "Zawodnik ({$teamsList})",
                    'avatar_url' => $player->avatar_url,
                    'unread_count' => $unreadCounts[$player->id] ?? 0,
                ];
            }
        }

        return response()->json([
            'channels' => $channels,
            'directs' => $directs,
        ]);
    }

    /**
     * Fetch message thread for a selected direct contact or group channel.
     */
    public function getMessages(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ($request->has('receiver_id')) {
            $otherUserId = $request->query('receiver_id');

            // Verify if chat is authorized
            $canChat = false;
            $otherUser = User::query()->find($otherUserId);
            if (!$otherUser) {
                return response()->json(['message' => 'Użytkownik nie istnieje.'], 404);
            }

            if ($user->role === 'player') {
                // Recipient must be a coach of one of the player's approved teams
                $teamIds = TeamMember::query()
                    ->where('user_id', $user->id)
                    ->where('status', TeamMember::STATUS_APPROVED)
                    ->pluck('team_id');
                $coachIds = \Illuminate\Support\Facades\DB::table('team_coaches')
                    ->whereIn('team_id', $teamIds)
                    ->pluck('user_id');
                if ($coachIds->contains($otherUserId)) {
                    $canChat = true;
                }
            } elseif ($user->role === 'coach') {
                // Recipient must be a player in one of the coach's teams
                $teamIds = Team::query()->whereHas('coaches', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                })->pluck('id');
                $isMember = TeamMember::query()
                    ->whereIn('team_id', $teamIds)
                    ->where('user_id', $otherUserId)
                    ->where('status', TeamMember::STATUS_APPROVED)
                    ->exists();
                if ($isMember) {
                    $canChat = true;
                }
            }

            if (!$canChat) {
                return response()->json(['message' => 'Brak uprawnień do rozmowy z tym użytkownikiem.'], 403);
            }

            // Fetch last 100 messages
            $messages = Message::query()
                ->where(function ($q) use ($user, $otherUserId) {
                    $q->where('sender_id', $user->id)->where('receiver_id', $otherUserId);
                })
                ->orWhere(function ($q) use ($user, $otherUserId) {
                    $q->where('sender_id', $otherUserId)->where('receiver_id', $user->id);
                })
                ->with('sender:id,first_name,last_name,role,avatar_url')
                ->orderBy('sent_at', 'asc')
                ->take(150)
                ->get();

            // Mark unread messages from other user to current user as read
            Message::query()
                ->where('sender_id', $otherUserId)
                ->where('receiver_id', $user->id)
                ->where('is_read', false)
                ->update(['is_read' => true]);

            $messages = $this->attachSenderRoles($messages, $user);

            return response()->json($messages);

        } elseif ($request->has('team_id')) {
            $teamId = $request->query('team_id');
            $team = Team::query()->find($teamId);

            if (!$team) {
                return response()->json(['message' => 'Drużyna nie istnieje.'], 404);
            }

            // Verify if user is part of the team
            $canChat = false;
            if ($user->role === 'coach') {
                if ($team->coaches()->where('users.id', $user->id)->exists()) {
                    $canChat = true;
                }
            } elseif ($user->role === 'player') {
                $canChat = TeamMember::query()
                    ->where('team_id', $teamId)
                    ->where('user_id', $user->id)
                    ->where('status', TeamMember::STATUS_APPROVED)
                    ->exists();
            }

            if (!$canChat) {
                return response()->json(['message' => 'Brak uprawnień do czatu grupowego tej drużyny.'], 403);
            }

            $messages = $this->attachSenderRoles($messages, $user);

            return response()->json($messages);
        }

        return response()->json(['message' => 'Brak parametru receiver_id lub team_id.'], 400);
    }

    /**
     * Send a message to a direct contact or group channel.
     */
    public function sendMessage(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'content' => 'required|string|max:5000',
            'receiver_id' => 'required_without:team_id|uuid|nullable',
            'team_id' => 'required_without:receiver_id|uuid|nullable',
        ]);

        $content = $request->input('content');
        $receiverId = $request->input('receiver_id');
        $teamId = $request->input('team_id');

        if ($receiverId) {
            // Validate direct chat permission
            $canChat = false;
            $otherUser = User::query()->find($receiverId);
            if (!$otherUser) {
                return response()->json(['message' => 'Odbiorca nie istnieje.'], 404);
            }

            if ($user->role === 'player') {
                $teamIds = TeamMember::query()
                    ->where('user_id', $user->id)
                    ->where('status', TeamMember::STATUS_APPROVED)
                    ->pluck('team_id');
                $coachIds = \Illuminate\Support\Facades\DB::table('team_coaches')
                    ->whereIn('team_id', $teamIds)
                    ->pluck('user_id');
                if ($coachIds->contains($receiverId)) {
                    $canChat = true;
                }
            } elseif ($user->role === 'coach') {
                $teamIds = Team::query()->whereHas('coaches', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                })->pluck('id');
                $isMember = TeamMember::query()
                    ->whereIn('team_id', $teamIds)
                    ->where('user_id', $receiverId)
                    ->where('status', TeamMember::STATUS_APPROVED)
                    ->exists();
                if ($isMember) {
                    $canChat = true;
                }
            }

            if (!$canChat) {
                return response()->json(['message' => 'Brak uprawnień do wysłania wiadomości do tego użytkownika.'], 403);
            }

            $message = Message::query()->create([
                'sender_id' => $user->id,
                'receiver_id' => $receiverId,
                'team_id' => null,
                'content' => $content,
                'is_read' => false,
                'sent_at' => now(),
            ]);

        } else {
            // Validate group chat permission
            $team = Team::query()->find($teamId);
            if (!$team) {
                return response()->json(['message' => 'Drużyna nie istnieje.'], 404);
            }

            $canChat = false;
            if ($user->role === 'coach') {
                if ($team->coaches()->where('users.id', $user->id)->exists()) {
                    $canChat = true;
                }
            } elseif ($user->role === 'player') {
                $canChat = TeamMember::query()
                    ->where('team_id', $teamId)
                    ->where('user_id', $user->id)
                    ->where('status', TeamMember::STATUS_APPROVED)
                    ->exists();
            }

            if (!$canChat) {
                return response()->json(['message' => 'Brak uprawnień do wysłania wiadomości w tym kanale.'], 403);
            }

            $message = Message::query()->create([
                'sender_id' => $user->id,
                'receiver_id' => null,
                'team_id' => $teamId,
                'content' => $content,
                'is_read' => false,
                'sent_at' => now(),
            ]);
        }

        $message->load('sender:id,first_name,last_name,role,avatar_url');
        $message = $this->attachSenderRoles($message, $user);

        return response()->json($message, 201);
    }

    /**
     * Mark direct messages from a specific sender to the current user as read.
     */
    public function markAsRead(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $request->validate([
            'sender_id' => 'required|uuid|exists:users,id',
        ]);

        $senderId = $request->input('sender_id');

        Message::query()
            ->where('sender_id', $senderId)
            ->where('receiver_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json(['success' => true]);
    }

    private function attachSenderRoles($messages, $currentUser)
    {
        $isArray = is_iterable($messages) || $messages instanceof \Illuminate\Support\Collection;
        $items = $isArray ? $messages : [$messages];

        foreach ($items as $msg) {
            $sender = $msg->sender;
            if ($sender) {
                if ($sender->role === 'coach') {
                    $role = null;
                    if ($msg->team_id) {
                        $role = DB::table('team_coaches')
                            ->where('team_id', $msg->team_id)
                            ->where('user_id', $sender->id)
                            ->value('role');
                    } else {
                        // Direct message: find coach's role in a team shared with the current user or receiver
                        $receiverId = $msg->receiver_id === $sender->id ? $msg->sender_id : ($msg->receiver_id ?? $currentUser->id);
                        $role = DB::table('team_coaches')
                            ->join('team_members', 'team_members.team_id', '=', 'team_coaches.team_id')
                            ->where('team_coaches.user_id', $sender->id)
                            ->where('team_members.user_id', $receiverId)
                            ->where('team_members.status', 'approved')
                            ->value('team_coaches.role');
                        
                        if (!$role) {
                            $role = DB::table('team_coaches')
                                ->where('user_id', $sender->id)
                                ->value('role');
                        }
                    }
                    $sender->team_role = $role ?? 'Trener';
                } else {
                    $sender->team_role = $sender->role === 'admin' ? 'Administrator' : 'Zawodnik';
                }
            }
        }

        return $messages;
    }
}
