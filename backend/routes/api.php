<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\DashboardController;

Route::get('/teams', [TeamController::class, 'index']);
Route::get('/teams/{id}/logo', [TeamController::class, 'logo']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);
Route::post('/auth/refresh', [AuthController::class, 'refresh']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        $user = $request->user();
        if ($user->role === 'player') {
            $user->load(['teamMemberships' => function ($q) {
                $q->where('status', 'approved')->with('team');
            }]);
        } elseif ($user->role === 'coach') {
            $user->load('coachedTeams');
        }
        return response()->json($user);
    });

    Route::put('/user', [UserController::class, 'updateProfile']);

    // -----------------------------------------------------
    // Zastrzeżona Strefa Administratora
    // -----------------------------------------------------
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::put('/users/{id}/role', [\App\Http\Controllers\AdminController::class, 'assignRole']);

        // Zabezpieczony wgląd dla admina
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Witaj Adminie w panelu dowodzenia']);
        });
        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::get('/events/{id}', [EventController::class, 'show']);
        Route::put('/events/{id}', [EventController::class, 'update']);
        Route::delete('/events/{id}', [EventController::class, 'destroy']);
        Route::get('/teams/coaches', [TeamController::class, 'coaches']);
        Route::get('/teams', [TeamController::class, 'adminIndex']);
        Route::post('/teams', [TeamController::class, 'store']);
        Route::get('/teams/{id}', [TeamController::class, 'show']);
        Route::put('/teams/{id}', [TeamController::class, 'update']);
        Route::delete('/teams/{id}', [TeamController::class, 'destroy']);

        // Zarządzanie zgłoszeniami do drużyn
        Route::get('/team-members', [\App\Http\Controllers\TeamMemberController::class, 'index']);
        Route::post('/team-members/{id}/approve', [\App\Http\Controllers\TeamMemberController::class, 'approve']);
        Route::post('/team-members/{id}/reject', [\App\Http\Controllers\TeamMemberController::class, 'reject']);



        // Pobieranie listy użytkowników
        Route::get('/users', [\App\Http\Controllers\AdminController::class, 'index']);
        Route::post('/users', [\App\Http\Controllers\AdminController::class, 'store']);
        Route::get('/users/{id}', [\App\Http\Controllers\AdminController::class, 'show']);
        Route::put('/users/{id}', [\App\Http\Controllers\AdminController::class, 'update']);
        Route::delete('/users/{id}', [\App\Http\Controllers\AdminController::class, 'destroy']);
    });



    // -----------------------------------------------------
    // Zastrzeżona Strefa Trenera
    // -----------------------------------------------------
    Route::middleware('role:coach')->prefix('coach')->group(function () {
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Witaj Trenerze w panelu zarządzania treningami']);
        });
        Route::get('/dashboard/players', [DashboardController::class, 'coachPlayers']);
        Route::get('/teams', [TeamController::class, 'coachIndex']);
        Route::get('/events', [EventController::class, 'coachIndex']);
        Route::post('/events', [EventController::class, 'coachStore']);
        Route::get('/events/{id}', [EventController::class, 'coachShow']);
        Route::put('/events/{id}', [EventController::class, 'coachUpdate']);
        Route::delete('/events/{id}', [EventController::class, 'coachDestroy']);

        // Ankiety zmęczenia zawodników trenera (tylko odczyt)
        Route::get('/fatigue-ratings', [\App\Http\Controllers\FatigueRatingController::class, 'coachIndex']);
    });

    // -----------------------------------------------------
    // Zastrzeżona Strefa Zawodnika
    // -----------------------------------------------------
    Route::middleware('role:player')->prefix('player')->group(function () {
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Witaj Zawodniku w swoim prywatnym panelu wyników']);
        });
        Route::get('/dashboard/summary', [DashboardController::class, 'playerSummary']);
        Route::get('/events', [EventController::class, 'playerIndex']);
        Route::get('/events/{id}', [EventController::class, 'playerShow']);
        Route::post('/events/{id}/attendance', [EventController::class, 'playerDeclareAttendance']);
        Route::post('/events/{id}/fatigue', [EventController::class, 'playerDeclareFatigue']);
    });
});
