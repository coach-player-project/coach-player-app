<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Team extends Model
{
    use HasFactory, HasUuids;

    const UPDATED_AT = null;

    protected $fillable = [
        'name',
        'description',
        'logo_path',
    ];

    protected $appends = [
        'logo_url',
        'coach',
    ];

    /**
     * Get the logo URL attribute.
     */
    public function getLogoUrlAttribute(): string
    {
        return url("/api/teams/{$this->id}/logo");
    }

    /**
     * Get the head coach (backward compatibility).
     */
    public function getCoachAttribute()
    {
        return $this->coaches()->wherePivot('role', 'Główny trener')->first();
    }

    /**
     * Get the coaches associated with the team.
     */
    public function coaches(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_coaches')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function trainingSessions()
    {
        return $this->hasMany(TrainingSession::class, 'team_id');
    }

    public function tactics()
    {
        return $this->hasMany(Tactic::class, 'team_id');
    }
}

