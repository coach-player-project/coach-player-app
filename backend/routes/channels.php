<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', function ($user, $id) {
    return (string) $user->id === (string) $id;
});

Broadcast::channel('team.{id}', function ($user, $id) {
    if ($user->role === 'coach') {
        return \Illuminate\Support\Facades\DB::table('team_coaches')
            ->where('team_id', $id)
            ->where('user_id', $user->id)
            ->exists();
    } elseif ($user->role === 'player') {
        return \App\Models\TeamMember::query()
            ->where('team_id', $id)
            ->where('user_id', $user->id)
            ->where('status', \App\Models\TeamMember::STATUS_APPROVED)
            ->exists();
    }
    return false;
});
