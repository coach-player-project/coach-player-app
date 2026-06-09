<?php

namespace App\Console\Commands;

use App\Models\Team;
use App\Http\Controllers\ApiFootballController;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncApiFootballFixtures extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-api-football-fixtures';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cykliczna synchronizacja meczów z API-Football dla wszystkich połączonych drużyn';

    /**
     * Execute the console command.
     */
    public function handle(ApiFootballController $controller)
    {
        $this->info('Rozpoczęcie synchronizacji meczów z API-Football...');
        Log::info('SyncApiFootballFixtures: Start automated sync.');

        $teams = Team::whereNotNull('api_football_team_id')->get();

        if ($teams->isEmpty()) {
            $this->info('Brak drużyn z aktywną integracją API-Football.');
            Log::info('SyncApiFootballFixtures: No linked teams found.');
            return Command::SUCCESS;
        }

        $totalSynced = 0;

        foreach ($teams as $team) {
            $this->info("Synchronizacja drużyny: {$team->name} (ID API: {$team->api_football_team_id})...");
            try {
                // We use the coach_id as the creator of the imported sessions
                $count = $controller->syncFixturesForTeam($team, $team->coach_id, true);
                $this->info("Zakończono. Zsynchronizowano {$count} meczów.");
                Log::info("SyncApiFootballFixtures: Synced {$count} fixtures for team {$team->name} ({$team->id}).");
                $totalSynced += $count;
            } catch (\Exception $e) {
                $this->error("Błąd podczas synchronizacji drużyny {$team->name}: " . $e->getMessage());
                Log::error("SyncApiFootballFixtures: Error syncing team {$team->id}: " . $e->getMessage());
            }
        }

        $this->info("Synchronizacja zakończona. Łącznie zaktualizowano {$totalSynced} meczów.");
        return Command::SUCCESS;
    }
}
