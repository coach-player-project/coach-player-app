<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\TrainingSession;
use App\Services\ApiFootballService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApiFootballController extends Controller
{
    protected ApiFootballService $apiFootballService;

    public function __construct(ApiFootballService $apiFootballService)
    {
        $this->apiFootballService = $apiFootballService;
    }

    /**
     * Get countries list.
     */
    public function getCountries()
    {
        if (!$this->apiFootballService->isConfigured()) {
            return response()->json([
                'message' => 'Integracja z API-Football nie jest skonfigurowana. Uzupełnij API_FOOTBALL_KEY w pliku .env.'
            ], 400);
        }

        $countries = $this->apiFootballService->getCountries();
        return response()->json(['data' => $countries], 200);
    }

    /**
     * Get leagues for country.
     */
    public function getLeagues(Request $request)
    {
        $request->validate([
            'country' => 'required|string'
        ]);

        if (!$this->apiFootballService->isConfigured()) {
            return response()->json(['message' => 'Brak konfiguracji API.'], 400);
        }

        $leagues = $this->apiFootballService->getLeagues($request->input('country'));
        return response()->json(['data' => $leagues], 200);
    }

    /**
     * Get teams for league and season.
     */
    public function getTeams(Request $request)
    {
        $request->validate([
            'league' => 'required|integer',
            'season' => 'required|integer'
        ]);

        if (!$this->apiFootballService->isConfigured()) {
            return response()->json(['message' => 'Brak konfiguracji API.'], 400);
        }

        $teams = $this->apiFootballService->getTeams(
            (int)$request->input('league'),
            (int)$request->input('season')
        );

        return response()->json(['data' => $teams], 200);
    }

    /**
     * Link local team to API-Football and optionally import fixtures.
     */
    public function linkTeam(Request $request, $teamId)
    {
        $user = $request->user();
        $team = Team::find($teamId);

        if (!$team) {
            return response()->json(['message' => 'Nie znaleziono drużyny.'], 404);
        }

        if ($team->coach_id !== $user->id) {
            return response()->json(['message' => 'Nie masz uprawnień do tej drużyny.'], 403);
        }

        $validated = $request->validate([
            'api_team_id' => 'required|integer',
            'api_league_id' => 'required|integer',
            'api_season' => 'required|integer',
            'api_team_name' => 'required|string',
            'import_fixtures' => 'nullable|boolean'
        ]);

        $team->update([
            'api_football_team_id' => $validated['api_team_id'],
            'api_football_league_id' => $validated['api_league_id'],
            'api_football_season' => $validated['api_season'],
            'api_football_team_name' => $validated['api_team_name'],
        ]);

        $importedCount = 0;
        if ($request->input('import_fixtures', true)) {
            $importedCount = $this->syncFixturesForTeam($team, $user->id);
        }

        return response()->json([
            'message' => 'Pomyślnie powiązano drużynę z rozgrywkami.',
            'team' => $team,
            'imported_fixtures_count' => $importedCount
        ], 200);
    }

    /**
     * Unlink local team from API-Football.
     */
    public function unlinkTeam(Request $request, $teamId)
    {
        $user = $request->user();
        $team = Team::find($teamId);

        if (!$team) {
            return response()->json(['message' => 'Nie znaleziono drużyny.'], 404);
        }

        if ($team->coach_id !== $user->id) {
            return response()->json(['message' => 'Nie masz uprawnień do tej drużyny.'], 403);
        }

        // Delete imported matches
        $deletedCount = TrainingSession::where('team_id', $team->id)
            ->whereNotNull('api_football_fixture_id')
            ->delete();

        $team->update([
            'api_football_team_id' => null,
            'api_football_league_id' => null,
            'api_football_season' => null,
            'api_football_team_name' => null,
        ]);

        return response()->json([
            'message' => 'Rozłączono integrację pomyślnie.',
            'deleted_fixtures_count' => $deletedCount,
            'team' => $team
        ], 200);
    }

    /**
     * Manually trigger sync for a team.
     */
    public function syncTeam(Request $request, $teamId)
    {
        $user = $request->user();
        $team = Team::find($teamId);

        if (!$team) {
            return response()->json(['message' => 'Nie znaleziono drużyny.'], 404);
        }

        if ($team->coach_id !== $user->id) {
            return response()->json(['message' => 'Nie masz uprawnień do tej drużyny.'], 403);
        }

        if (!$team->api_football_team_id) {
            return response()->json(['message' => 'Ta drużyna nie jest powiązana z API-Football.'], 400);
        }

        $syncCount = $this->syncFixturesForTeam($team, $user->id, true);

        return response()->json([
            'message' => 'Synchronizacja zakończona pomyślnie.',
            'synced_count' => $syncCount
        ], 200);
    }

    /**
     * Internal logic to sync fixtures.
     */
    public function syncFixturesForTeam(Team $team, string $userId, bool $bypassCache = false): int
    {
        if (!$team->api_football_team_id || !$team->api_football_league_id || !$team->api_football_season) {
            return 0;
        }

        $fixtures = $this->apiFootballService->getFixtures(
            (int)$team->api_football_team_id,
            (int)$team->api_football_league_id,
            (int)$team->api_football_season,
            $bypassCache
        );

        if (empty($fixtures)) {
            return 0;
        }

        $syncedCount = 0;

        foreach ($fixtures as $item) {
            $fixtureData = $item['fixture'] ?? [];
            $leagueData = $item['league'] ?? [];
            $teamsData = $item['teams'] ?? [];
            $goalsData = $item['goals'] ?? [];

            $fixtureId = $fixtureData['id'] ?? null;
            if (!$fixtureId) {
                continue;
            }

            $homeName = $teamsData['home']['name'] ?? 'Gospodarze';
            $awayName = $teamsData['away']['name'] ?? 'Goście';
            $title = "{$homeName} vs {$awayName}";

            $scheduledAt = isset($fixtureData['date']) ? date('Y-m-d H:i:s', strtotime($fixtureData['date'])) : now();
            $venueName = $fixtureData['venue']['name'] ?? 'brak danych';
            $venueCity = $fixtureData['venue']['city'] ?? '';
            $referee = $fixtureData['referee'] ?? 'brak danych';
            $round = $leagueData['round'] ?? '';
            $statusLong = $fixtureData['status']['long'] ?? '';
            $statusShort = $fixtureData['status']['short'] ?? '';
            $elapsed = $fixtureData['status']['elapsed'] ?? null;

            $goalsHome = $goalsData['home'] ?? null;
            $goalsAway = $goalsData['away'] ?? null;

            $description = "Oficjalny mecz ligowy\n";
            $description .= "Rozgrywki: {$leagueData['name']} ({$round})\n";
            $description .= "Stadion: {$venueName}" . ($venueCity ? ", {$venueCity}" : "") . "\n";
            $description .= "Sędzia: {$referee}\n";
            $description .= "Status: {$statusLong}\n";

            if ($goalsHome !== null && $goalsAway !== null) {
                $description .= "Wynik: {$goalsHome} - {$goalsAway}";
                if ($statusShort === 'FT') {
                    $description .= " (Koniec)";
                } elseif ($statusShort === 'HT') {
                    $description .= " (Do przerwy)";
                } elseif (in_array($statusShort, ['1H', '2H'])) {
                    $description .= " (W trakcie - {$elapsed}')";
                }
            }

            // Check if fixture already imported
            $session = TrainingSession::where('api_football_fixture_id', $fixtureId)->first();

            if ($session) {
                // Update existing
                $session->update([
                    'title' => $title,
                    'description' => $description,
                    'scheduled_at' => $scheduledAt,
                ]);

                // Also trigger Google Calendar sync if Google event exists
                try {
                    $calendarService = app(\App\Services\GoogleCalendarService::class);
                    if ($calendarService->isConfigured() && $session->google_event_id) {
                        $calendarService->updateEvent($session);
                    }
                } catch (\Exception $e) {
                    Log::error("Google Calendar sync failed during API-Football update for session {$session->id}: " . $e->getMessage());
                }
            } else {
                // Create new
                $newSession = TrainingSession::create([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'team_id' => $team->id,
                    'created_by' => $userId,
                    'event_type' => 'match',
                    'title' => $title,
                    'description' => $description,
                    'scheduled_at' => $scheduledAt,
                    'duration_minutes' => 120, // 90 min match + warm up/rest
                    'api_football_fixture_id' => $fixtureId
                ]);

                // Trigger Google Calendar sync
                try {
                    $calendarService = app(\App\Services\GoogleCalendarService::class);
                    if ($calendarService->isConfigured()) {
                        $googleEventId = $calendarService->createEvent($newSession);
                        if ($googleEventId) {
                            $newSession->update(['google_event_id' => $googleEventId]);
                        }
                    }
                } catch (\Exception $e) {
                    Log::error("Google Calendar sync failed during API-Football creation for session {$newSession->id}: " . $e->getMessage());
                }
            }

            $syncedCount++;
        }

        return $syncedCount;
    }
}
