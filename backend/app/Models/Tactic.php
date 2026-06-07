<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tactic extends Model
{
    use HasUuids;

    protected $table = 'tactics';

    const UPDATED_AT = null;

    protected $fillable = [
        'team_id',
        'created_by',
        'title',
        'description',
        'canvas_data',
        'formation',
        'match_date',
    ];

    protected $casts = [
        'match_date' => 'datetime',
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
}
