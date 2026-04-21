<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;

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
        Route::get('/dashboard', function() {
            return response()->json(['message' => 'Witaj Adminie w panelu dowodzenia']);
        });
    });

    // -----------------------------------------------------
    // Zastrzeżona Strefa Trenera
    // -----------------------------------------------------
    Route::middleware('role:coach')->prefix('coach')->group(function () {
        Route::get('/dashboard', function() {
            return response()->json(['message' => 'Witaj Trenerze w panelu zarządzania treningami']);
        });
    });

    // -----------------------------------------------------
    // Zastrzeżona Strefa Zawodnika
    // -----------------------------------------------------
    Route::middleware('role:player')->prefix('player')->group(function () {
        Route::get('/dashboard', function() {
            return response()->json(['message' => 'Witaj Zawodniku w swoim prywatnym panelu wyników']);
        });
    });
});
