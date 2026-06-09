<?php

namespace App\Services;

use App\Models\TrainingSession;
use Google\Client;
use Google\Service\Calendar;
use Google\Service\Calendar\Event;
use Google\Service\Calendar\EventDateTime;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    protected ?Calendar $service = null;
    protected ?string $calendarId = null;

    public function __construct()
    {
        $this->calendarId = env('GOOGLE_CALENDAR_ID');
        $credentialsPath = env('GOOGLE_SERVICE_ACCOUNT_JSON');

        if (!$this->calendarId) {
            Log::warning('Google Calendar integration: GOOGLE_CALENDAR_ID is not set in .env');
            return;
        }

        if (!$credentialsPath) {
            Log::warning('Google Calendar integration: GOOGLE_SERVICE_ACCOUNT_JSON is not set in .env');
            return;
        }

        $resolvedPath = null;
        if (file_exists($credentialsPath)) {
            $resolvedPath = $credentialsPath;
        } elseif (file_exists(base_path($credentialsPath))) {
            $resolvedPath = base_path($credentialsPath);
        } elseif (str_starts_with($credentialsPath, 'backend/') && file_exists(base_path(substr($credentialsPath, 8)))) {
            $resolvedPath = base_path(substr($credentialsPath, 8));
        } else {
            $fileName = basename($credentialsPath);
            $storageAppPath = storage_path('app/' . $fileName);
            if (file_exists($storageAppPath)) {
                $resolvedPath = $storageAppPath;
            }
        }

        try {
            $client = new Client();
            $client->setScopes([Calendar::CALENDAR]);

            if ($resolvedPath) {
                Log::info("Google Calendar integration: Using credentials file at '{$resolvedPath}'");
                $client->setAuthConfig($resolvedPath);
            } else {
                $decoded = json_decode($credentialsPath, true);
                if (is_array($decoded)) {
                    $client->setAuthConfig($decoded);
                } else {
                    Log::warning("Google Calendar integration: credentials file not found at '{$credentialsPath}' (searched base_path and storage_path) and GOOGLE_SERVICE_ACCOUNT_JSON is not a valid JSON string");
                    return;
                }
            }

            $this->service = new Calendar($client);
        } catch (\Exception $e) {
            Log::error('Google Calendar integration initialization error: ' . $e->getMessage());
        }
    }

    public function isConfigured(): bool
    {
        return $this->service !== null && $this->calendarId !== null;
    }

    /**
     * Create event in Google Calendar.
     */
    public function createEvent(TrainingSession $session): ?string
    {
        if (!$this->isConfigured()) {
            return null;
        }

        try {
            $event = $this->buildGoogleEvent($session);
            $createdEvent = $this->service->events->insert($this->calendarId, $event);
            return $createdEvent->getId();
        } catch (\Exception $e) {
            Log::error('Google Calendar failed to create event: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Update event in Google Calendar.
     */
    public function updateEvent(TrainingSession $session): bool
    {
        if (!$this->isConfigured() || !$session->google_event_id) {
            return false;
        }

        try {
            $event = $this->buildGoogleEvent($session);
            $this->service->events->update($this->calendarId, $session->google_event_id, $event);
            return true;
        } catch (\Exception $e) {
            Log::error("Google Calendar failed to update event {$session->google_event_id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Delete event from Google Calendar.
     */
    public function deleteEvent(TrainingSession $session): bool
    {
        if (!$this->isConfigured() || !$session->google_event_id) {
            return false;
        }

        try {
            $this->service->events->delete($this->calendarId, $session->google_event_id);
            return true;
        } catch (\Exception $e) {
            Log::error("Google Calendar failed to delete event {$session->google_event_id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Helper to build Google Event from TrainingSession.
     */
    protected function buildGoogleEvent(TrainingSession $session): Event
    {
        $startDateTime = new \DateTime($session->scheduled_at);
        $duration = $session->duration_minutes ?? 90;

        $endDateTime = clone $startDateTime;
        $endDateTime->modify("+{$duration} minutes");

        $typeLabel = $session->event_type === 'match' ? 'Mecz' : 'Trening';
        $summary = "[{$typeLabel}] {$session->title}";

        $description = $session->description ?? '';

        // Add drills list if they are loaded
        if (isset($session->exercises) && is_iterable($session->exercises)) {
            $description .= "\n\nPlan ćwiczeń:";
            foreach ($session->exercises as $index => $ex) {
                $description .= "\n" . ($index + 1) . ". " . (is_array($ex) ? $ex['name'] : $ex->name);
            }
        }

        $event = new Event([
            'summary' => $summary,
            'description' => $description,
            'start' => new EventDateTime([
                'dateTime' => $startDateTime->format(\DateTime::RFC3339),
                'timeZone' => config('app.timezone', 'UTC'),
            ]),
            'end' => new EventDateTime([
                'dateTime' => $endDateTime->format(\DateTime::RFC3339),
                'timeZone' => config('app.timezone', 'UTC'),
            ]),
        ]);

        return $event;
    }
}
