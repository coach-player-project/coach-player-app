# Coach Player App

Aplikacja webowa wspierająca współpracę trenera z zawodnikami — planowanie treningów i meczów, interaktywna tablica taktyczna, deklaracje obecności, ocena zmęczenia (RPE) oraz czat w czasie rzeczywistym.

Projekt zrealizowany w ramach pracy projektowej na kierunku Informatyka, Uniwersytet Rzeszowski (Wydział Nauk Ścisłych i Technicznych, Instytut Informatyki).

**Autorzy:** Dawid Bajek (131402), Krzysztof Dąbrowski (131421)

## Spis treści

- [Funkcjonalności](#funkcjonalności)
- [Stos technologiczny](#stos-technologiczny)
- [Architektura](#architektura)
- [Szybki start (Docker)](#szybki-start-docker)
- [Konfiguracja zmiennych środowiskowych](#konfiguracja-zmiennych-środowiskowych)
- [Konta demonstracyjne](#konta-demonstracyjne)
- [Integracje zewnętrzne](#integracje-zewnętrzne)
- [REST API](#rest-api)
- [Baza danych](#baza-danych)
- [Testy](#testy)
- [Struktura repozytorium](#struktura-repozytorium)
- [Kierunki rozwoju](#kierunki-rozwoju)

## Funkcjonalności

System obsługuje trzy role: **trener**, **zawodnik** i **administrator**.

### Trener
- kalendarz wydarzeń (widok listy i miesięczny) — planowanie treningów i meczów wraz z listą ćwiczeń,
- **projektant taktyki** na HTML5 Canvas (boisko 800×500): przeciąganie zawodników i piłki, rysowanie odręczne, strzałki, linie przerywane, pachołki, gotowe formacje (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2), podgląd przeciwników,
- lista obecności zawodników na wydarzeniu,
- podgląd zespołu z kolorowym wskaźnikiem ostatniego zmęczenia (RPE),
- czat indywidualny i grupowy z zawodnikami,
- integracja z Google Calendar i API-Football (kreator łączenia drużyny, import i synchronizacja meczów).

### Zawodnik
- pulpit: najbliższe wydarzenie, status obecności, „Twoja forma” (średnie RPE z 30 dni),
- kalendarz miesięczny z panelem szczegółów, deklaracja obecności (obecny / nieobecny / spóźniony) z uzasadnieniem,
- podgląd taktyki (tryb tylko do odczytu),
- ankieta po treningu: intensywność (Borg RPE 1–10), zmęczenie fizyczne i psychiczne (1–5),
- czat z trenerem i drużyną.

### Administrator
- zarządzanie użytkownikami i rolami,
- zarządzanie drużynami i przypisywanie trenerów (wielu trenerów na drużynę),
- akceptacja / odrzucanie próśb zawodników o dołączenie do drużyny.

### Pozostałe
- uwierzytelnianie tokenami (Laravel Sanctum), reset hasła, hasła hashowane bcrypt,
- czat realtime przez WebSockety (Laravel Reverb + Laravel Echo): licznik nieprzeczytanych, wskaźnik pisania, statusy odczytu,
- jasny / ciemny / systemowy motyw (`next-themes`), responsywny interfejs (desktop i mobile),
- dokumentacja API w Swaggerze.

## Stos technologiczny

| Warstwa | Technologie |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, next-themes, Laravel Echo |
| Backend | PHP 8.2, Laravel 12, Laravel Sanctum, Laravel Reverb, L5-Swagger |
| Baza danych | PostgreSQL 16 |
| Integracje | Google Calendar API (konto usługowe), API-Football (API-Sports) |
| Infrastruktura | Docker, Docker Compose |
| Testy | PHPUnit (SQLite `:memory:`), ESLint + TypeScript |

## Architektura

Architektura klient–serwer, trzy kontenery w sieci Docker:

```
┌──────────────┐   REST (JSON, Bearer token)    ┌─────────────────┐      ┌──────────────┐
│  frontend    │ ─────────────────────────────▶ │    backend      │ ───▶ │      db      │
│  Next.js     │                                │  Laravel :8000  │      │ PostgreSQL   │
│  :3000       │ ◀───── WebSocket (Reverb) ──── │  Reverb  :8080  │      │ :5433 (host) │
└──────────────┘                                └─────────────────┘      └──────────────┘
                                                   │            │
                                          Google Calendar   API-Football
```

| Usługa | Obraz / technologia | Port (host) |
|---|---|---|
| `db` | `postgres:16-alpine` | 5433 |
| `backend` | PHP 8.2 + Laravel (API + Reverb) | 8000 (API), 8080 (WebSocket) |
| `frontend` | Node 20 + Next.js | 3000 |

## Szybki start (Docker)

### Wymagania

- Docker 24.0+
- Docker Compose 2.20+
- Git 2.30+

### Uruchomienie

```bash
git clone <adres-repozytorium>
cd coach-player-app
cp .env.example .env
docker compose up -d --build
```

Kontener `backend` przy starcie automatycznie czyści cache konfiguracji, wykonuje migracje wraz z seedowaniem (`php artisan migrate --seed --force`) i uruchamia serwer Reverb oraz serwer API.

Jeśli zależności Composera nie zostały zainstalowane lub brakuje klucza aplikacji:

```bash
docker compose exec backend composer install
docker compose exec backend php artisan key:generate
```

Stan kontenerów:

```bash
docker compose ps
```

Po uruchomieniu:

| Adres | Opis |
|---|---|
| http://localhost:3000 | aplikacja (frontend) |
| http://localhost:8000 | serwer API |
| http://localhost:8000/api/documentation | dokumentacja Swagger |

> Wywołanie `migrate --seed` czyści bazę i zakłada dane demonstracyjne (patrz niżej) — nie używaj go na danych, które chcesz zachować.

Ręczne uruchomienie serwera WebSocket (gdyby nie wystartował automatycznie):

```bash
docker compose exec backend php artisan reverb:start
```

## Konfiguracja zmiennych środowiskowych

### Docker Compose (`.env` w katalogu głównym)

```env
# PostgreSQL
DB_DATABASE=coach_player
DB_USERNAME=coach
DB_PASSWORD=secret

# Klucz aplikacji Laravel (jeśli pusty — wygeneruj: php artisan key:generate)
APP_KEY=

# Integracje (opcjonalne)
GOOGLE_CALENDAR_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=
API_FOOTBALL_KEY=
API_FOOTBALL_URL=
```

### Backend (`backend/.env`, przy uruchomieniu bez Dockera)

Szablon: `backend/.env.example`. Kluczowe sekcje: ustawienia aplikacji Laravel, połączenie PostgreSQL (`DB_*`), Laravel Reverb (`REVERB_*`), `API_FOOTBALL_KEY` oraz `GOOGLE_SERVICE_ACCOUNT_JSON`.

### Frontend (`frontend/.env.local`, przy uruchomieniu bez Dockera)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_REVERB_APP_KEY=coach_key
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

`NEXT_PUBLIC_REVERB_APP_KEY` musi być zgodny z `REVERB_APP_KEY` po stronie backendu.

> Plików `.env` ani kluczy API / danych konta usługowego Google nie należy publikować w repozytorium.

## Konta demonstracyjne

Seeder (`backend/database/seeders/DatabaseSeeder.php`) tworzy m.in.:

| Rola | E-mail | Hasło |
|---|---|---|
| Administrator | `admin@example.com` | `password123` |
| Trener | `coach@example.com` | `password123` |
| Trener 2 | `coach2@example.com` | `password123` |
| Zawodnik | `player1@example.com` … `player22@example.com` | `password123` |

Seeder tworzy 22 zawodników przypisanych do dwóch drużyn oraz przykładowe dane obecności.

## Integracje zewnętrzne

Obie integracje są opcjonalne — brak konfiguracji nie blokuje działania aplikacji.

**Google Calendar** (`GoogleCalendarService`) — po utworzeniu, edycji lub usunięciu wydarzenia aplikacja synchronizuje je z kalendarzem Google (identyfikator zapisywany w `google_event_id`). Wymaga konta usługowego (`GOOGLE_SERVICE_ACCOUNT_JSON`) i `GOOGLE_CALENDAR_ID`. Przy braku konfiguracji błąd jest logowany, a wydarzenie i tak zapisuje się lokalnie.

**API-Football** (`ApiFootballService`, API-Sports) — pobieranie krajów, lig, drużyn i terminarzy meczów. Wymaga `API_FOOTBALL_KEY`. Odpowiedzi są cache'owane (kraje 30 dni, ligi i drużyny 7 dni, terminarz 1 godzina). Kreator w `/pages/coach/settings` łączy drużynę lokalną z oficjalną i importuje mecze jako wydarzenia typu `match`. Automatyczna synchronizacja:

```bash
docker compose exec backend php artisan app:sync-api-football-fixtures
```

Komendę można uruchamiać cyklicznie harmonogramem zadań (cron). Bez klucza API backend zwraca `400 Bad Request` z czytelnym komunikatem.

## REST API

Swagger UI: http://localhost:8000/api/documentation

Trasy chronione są przez `auth:sanctum` oraz middleware ról (`role:admin`, `role:coach`, `role:player`). Wybrane endpointy:

| Metoda | Endpoint | Dostęp |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | publiczny |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | publiczny |
| POST | `/api/auth/logout` | zalogowany |
| GET / PUT | `/api/user` | zalogowany |
| GET | `/api/messages/contacts`, `/api/messages` | zalogowany |
| POST | `/api/messages`, `/api/messages/read` | zalogowany |
| GET / POST / PUT / DELETE | `/api/coach/events[/{id}]` | trener |
| GET / POST | `/api/coach/events/{id}/attendance` | trener |
| GET / POST / PUT / DELETE | `/api/coach/tactics[/{id}]` | trener |
| GET | `/api/coach/fatigue-ratings` | trener |
| POST | `/api/coach/teams/{id}/link-api-football`, `/sync-api-football` | trener |
| GET | `/api/player/events`, `/api/player/tactics` | zawodnik |
| POST | `/api/player/events/{id}/attendance` | zawodnik |
| POST | `/api/player/events/{id}/fatigue` | zawodnik |
| GET / POST / PUT / DELETE | `/api/admin/users`, `/api/admin/teams` | administrator |
| GET | `/api/admin/team-members?status=pending` | administrator |
| POST | `/api/admin/team-members/{id}/approve`, `/reject` | administrator |

Pełna lista tras: `backend/routes/api.php`.

## Baza danych

Główne tabele: `users`, `teams`, `team_coaches`, `team_members` (ze statusem zgłoszenia), `training_sessions` (treningi i mecze, w tym dane taktyki w JSON i identyfikatory usług zewnętrznych), `training_exercises`, `attendance`, `fatigue_ratings`, `tactics`, `tactic_players`, `messages`.

Diagram ERD: [diagram_erd.png](diagram_erd.png).

Współrzędne na tablicy taktycznej zapisywane są jako wartości względne (0.0–1.0), dzięki czemu schemat wygląda tak samo na każdym rozmiarze ekranu.

## Testy

Testy backendu (PHPUnit, baza SQLite w pamięci, `RefreshDatabase`):

```bash
docker compose exec backend php artisan test
```

Zakres testów: rejestracja trenera i akceptacja przez administratora, deklaracje obecności i kontrola dostępu (401 / 403), członkostwo w drużynach, integracja API-Football.

Statyczna analiza frontendu:

```bash
cd frontend
npm install
npm run lint
```

Dodatkowo przeprowadzono manualne testy End-to-End (tablica Canvas, czat, ankieta RPE, responsywność na iPhone 15 i Galaxy S23, przeglądarki Chrome / Safari / Firefox / Edge).

## Struktura repozytorium

```
.
├── backend/                 # Laravel 12 (API, Reverb, migracje, seedery, testy)
│   ├── app/Http/Controllers # kontrolery REST
│   ├── app/Services         # GoogleCalendarService, ApiFootballService
│   ├── app/Console/Commands # SyncApiFootballFixtures
│   ├── database/            # migracje i seedery
│   ├── routes/api.php       # definicje tras
│   └── tests/Feature        # testy integracyjne
├── frontend/                # Next.js (app router, komponenty, hooki)
├── docker-compose.yml
├── .env.example
└── diagram_erd.png
```

## Kierunki rozwoju

- integracja z urządzeniami ubieralnymi (Garmin, Apple Watch, Fitbit),
- modele predykcyjne ryzyka przeciążeń i kontuzji na podstawie RPE i obciążeń,
- aplikacja mobilna (React Native) z powiadomieniami push,
- rozbudowane raporty analityczne dla trenerów i administratorów.

## Dokumentacja

Pełny opis projektu (analiza wymagań, projekt bazy danych, implementacja, testy, instrukcja użytkownika) znajduje się w pracy projektowej „Projekt i implementacja aplikacji webowej wspierającej współpracę trenera z zawodnikami”, Rzeszów 2026.
