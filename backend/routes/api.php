<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\EventController;

Route::get('/teams', [TeamController::class, 'index']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/refresh', [AuthController::class, 'refresh']);
Route::post('/auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        return clone $request->user();
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
    });



    // -----------------------------------------------------
    // Zastrzeżona Strefa Trenera
    // -----------------------------------------------------
    Route::middleware('role:coach')->prefix('coach')->group(function () {
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Witaj Trenerze w panelu zarządzania treningami']);
        });
    });

    // -----------------------------------------------------
    // Zastrzeżona Strefa Zawodnika
    // -----------------------------------------------------
    Route::middleware('role:player')->prefix('player')->group(function () {
        Route::get('/dashboard', function () {
            return response()->json(['message' => 'Witaj Zawodniku w swoim prywatnym panelu wyników']);
        });
    });
});
