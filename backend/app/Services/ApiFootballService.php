<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ApiFootballService
{
    protected ?string $apiKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = env('API_FOOTBALL_KEY');
        $url = env('API_FOOTBALL_URL');
        if (empty($url)) {
            $url = 'https://v3.football.api-sports.io/';
        }
        $this->baseUrl = rtrim($url, '/') . '/';
    }

    /**
     * Check if the API key is configured.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }

    /**
     * Get authorization and content-type headers.
     */
    protected function getHeaders(): array
    {
        return [
            'x-apisports-key' => $this->apiKey,
            'Accept' => 'application/json',
        ];
    }

    /**
     * Fetch countries (cached for 30 days)
     */
    public function getCountries(): array
    {
        if (!$this->isConfigured()) {
            Log::warning('API-Football: Attempted to get countries without API key configured.');
            return [];
        }

        return Cache::remember('api_football_countries', now()->addDays(30), function () {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->baseUrl . 'countries');

                $this->checkAndThrowErrors($response);

                if ($response->successful() && isset($response->json()['response'])) {
                    return $response->json()['response'];
                }
                
                Log::warning('API-Football failed to fetch countries: ' . $response->body());
                return [];
            } catch (\Exception $e) {
                Log::error('API-Football exception fetching countries: ' . $e->getMessage());
                throw $e;
            }
        });
    }

    /**
     * Fetch leagues for a country (cached for 7 days)
     */
    public function getLeagues(string $country): array
    {
        if (!$this->isConfigured()) {
            return [];
        }

        $slug = Str::slug($country);
        $cacheKey = 'api_football_leagues_' . $slug;

        return Cache::remember($cacheKey, now()->addDays(7), function () use ($country) {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->baseUrl . 'leagues', [
                        'country' => $country
                    ]);

                $this->checkAndThrowErrors($response);

                if ($response->successful() && isset($response->json()['response'])) {
                    return $response->json()['response'];
                }

                Log::warning("API-Football failed to fetch leagues for {$country}: " . $response->body());
                return [];
            } catch (\Exception $e) {
                Log::error("API-Football exception fetching leagues for {$country}: " . $e->getMessage());
                throw $e;
            }
        });
    }

    /**
     * Fetch teams for a league and season (cached for 7 days)
     */
    public function getTeams(int $leagueId, int $season): array
    {
        if (!$this->isConfigured()) {
            return [];
        }

        $cacheKey = "api_football_teams_{$leagueId}_{$season}";

        return Cache::remember($cacheKey, now()->addDays(7), function () use ($leagueId, $season) {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->baseUrl . 'teams', [
                        'league' => $leagueId,
                        'season' => $season
                    ]);

                $this->checkAndThrowErrors($response);

                if ($response->successful() && isset($response->json()['response'])) {
                    return $response->json()['response'];
                }

                Log::warning("API-Football failed to fetch teams for league {$leagueId} season {$season}: " . $response->body());
                return [];
            } catch (\Exception $e) {
                Log::error("API-Football exception fetching teams: " . $e->getMessage());
                throw $e;
            }
        });
    }

    /**
     * Fetch fixtures for a team (cached for 1 hour, bypassable for manual sync)
     */
    public function getFixtures(int $teamId, int $leagueId, int $season, bool $bypassCache = false): array
    {
        if (!$this->isConfigured()) {
            return [];
        }

        $cacheKey = "api_football_fixtures_{$teamId}_{$leagueId}_{$season}";

        $fetchCallback = function () use ($teamId, $leagueId, $season) {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get($this->baseUrl . 'fixtures', [
                        'team' => $teamId,
                        'league' => $leagueId,
                        'season' => $season
                    ]);

                $this->checkAndThrowErrors($response);

                if ($response->successful() && isset($response->json()['response'])) {
                    return $response->json()['response'];
                }

                Log::warning("API-Football failed to fetch fixtures for team {$teamId}: " . $response->body());
                return [];
            } catch (\Exception $e) {
                Log::error("API-Football exception fetching fixtures: " . $e->getMessage());
                throw $e;
            }
        };

        if ($bypassCache) {
            $data = $fetchCallback();
            if (!empty($data)) {
                Cache::put($cacheKey, $data, now()->addHours(1));
            }
            return $data;
        }

        return Cache::remember($cacheKey, now()->addHours(1), $fetchCallback);
    }

    /**
     * Check if the API response contains errors and throw an exception.
     */
    protected function checkAndThrowErrors(\Illuminate\Http\Client\Response $response)
    {
        if ($response->successful()) {
            $json = $response->json();
            if (!empty($json['errors'])) {
                $errors = $json['errors'];
                if (is_array($errors)) {
                    $messages = [];
                    foreach ($errors as $key => $value) {
                        $messages[] = is_string($key) ? "{$key}: {$value}" : (string)$value;
                    }
                    $errStr = implode(', ', $messages);
                } else {
                    $errStr = (string)$errors;
                }
                throw new \Exception($errStr);
            }
        }
    }
}
