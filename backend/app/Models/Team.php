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
        'coach_id',
        'logo_path',
        'api_football_team_id',
        'api_football_league_id',
        'api_football_season',
        'api_football_team_name',
    ];

    protected $appends = [
        'logo_url',
    ];

    /**
     * Get the logo URL attribute.
     */
    public function getLogoUrlAttribute(): string
    {
        return url("/api/teams/{$this->id}/logo");
    }

    /**
     * Get the coach associated with the team.
     */
    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_id');
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

