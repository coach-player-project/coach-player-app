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

            // Create Sanctum Token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Pomyślnie zalogowano.',
                'user' => $user,
                'token' => $token,
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
     * Terminate user session and revoke token.
     */
    public function logout(Request $request)
    {
        try {
            // Delete current token associated with request
            $request->user()->currentAccessToken()->delete();

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
}
