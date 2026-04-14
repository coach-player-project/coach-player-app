<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    public function register(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
                'password' => ['required', 'string', 'min:8'],
                'role' => ['required', 'string', 'in:trener,zawodnik'],
            ]);

            $user = User::create([
                'first_name' => $validatedData['first_name'],
                'last_name' => $validatedData['last_name'],
                'email' => $validatedData['email'],
                'password_hash' => Hash::make($validatedData['password']),
                'role' => $validatedData['role'],
            ]);

            return response()->json([
                'message' => 'Użytkownik został pomyślnie zarejestrowany.',
                'user' => $user
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Błąd walidacji danych.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Wystąpił błąd podczas rejestracji użytkownika.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Authenticate user and issue token.
     */
    public function login(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'email' => ['required', 'string', 'email'],
                'password' => ['required', 'string'],
            ]);

            $user = User::where('email', $validatedData['email'])->first();

            if (!$user || !Hash::check($validatedData['password'], $user->password_hash)) {
                return response()->json([
                    'message' => 'Podano nieprawidłowy adres e-mail lub hasło.'
                ], 401);
            }

            // Generate Access Token (expires in 15 minutes) for short-lived requests
            $accessToken = $user->createToken(
                'access_token', 
                ['*'], 
                now()->addMinutes(15)
            )->plainTextToken;

            // Generate Refresh Token (expires in 7 days) to silently renew the access
            $refreshToken = $user->createToken(
                'refresh_token', 
                ['*'], 
                now()->addDays(7)
            )->plainTextToken;

            return response()->json([
                'message' => 'Pomyślnie zalogowano.',
                'user' => $user,
                'token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer'
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Błąd walidacji danych.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Wystąpił błąd podczas logowania.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Terminate user session and revoke current token.
     */
    public function logout(Request $request)
    {
        try {
            // Delete the current access token
            if ($request->user() && $request->user()->currentAccessToken()) {
                 $request->user()->currentAccessToken()->delete();
            }

            return response()->json([
                'message' => 'Wylogowano pomyślnie i zamknięto sesję.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Wystąpił błąd podczas wylogowania.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Refresh access and refresh tokens.
     */
    public function refresh(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'refresh_token' => ['required', 'string']
            ]);

            // Find the token in Sanctum's personal_access_tokens table
            $hashedToken = hash('sha256', explode('|', $validatedData['refresh_token'])[1] ?? '');
            
            $tokenModel = \Laravel\Sanctum\PersonalAccessToken::where('token', $hashedToken)
                ->where('name', 'refresh_token')
                ->first();

            if (!$tokenModel || ($tokenModel->expires_at && $tokenModel->expires_at->isPast())) {
                return response()->json([
                    'message' => 'Token odświeżania jest nieważny lub wygasł.'
                ], 401);
            }

            $user = $tokenModel->tokenable;

            // Delete the consumed refresh token entirely
            $tokenModel->delete();

            // Optionally, delete ALL user's older tokens here if you want strict concurrency, 
            // but usually we just delete the consumed one. To keep it clean: We delete it above.

            // Issue new pair of tokens
            $newAccessToken = $user->createToken('access_token', ['*'], now()->addMinutes(15))->plainTextToken;
            $newRefreshToken = $user->createToken('refresh_token', ['*'], now()->addDays(7))->plainTextToken;

            return response()->json([
                'message' => 'Tokeny zostały poprawnie odświeżone.',
                'token' => $newAccessToken,
                'refresh_token' => $newRefreshToken,
                'token_type' => 'Bearer'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Wystąpił błąd podczas odświeżania tokenu.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
