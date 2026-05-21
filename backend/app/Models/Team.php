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
}
