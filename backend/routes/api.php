<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;

Route::get('/user', function (Request $request) {
    return $request->user() ?? \App\Models\User::first();
});

Route::put('/user', [UserController::class, 'updateProfile']);
