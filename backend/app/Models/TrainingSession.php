<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingSession extends Model
{
    use HasUuids;

    protected $table = 'training_sessions';

    const UPDATED_AT = null;

    protected $fillable = [
        'team_id',
        'created_by',
        'event_type',
        'title',
        'description',
        'scheduled_at',
        'duration_minutes',
        'canvas_data',
        'google_event_id',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'duration_minutes' => 'integer',
        'created_at' => 'datetime',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'training_id');
    }

    public function fatigueRatings(): HasMany
    {
        return $this->hasMany(FatigueRating::class, 'training_id');
    }
}
