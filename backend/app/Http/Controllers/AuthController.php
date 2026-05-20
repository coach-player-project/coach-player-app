<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use OpenApi\Attributes as OA;

class AuthController extends Controller
{
    /**
     * Register a new user.
     */
    #[OA\Post(
        path: '/api/auth/register',
        summary: 'Rejestracja użytkownika',
        description: 'Rejestruje nowego użytkownika w systemie',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/x-www-form-urlencoded',
                schema: new OA\Schema(
                    required: ['first_name', 'last_name', 'email', 'password', 'role'],
                    properties: [
                        new OA\Property(property: 'first_name', type: 'string'),
                        new OA\Property(property: 'last_name', type: 'string'),
                        new OA\Property(property: 'email', type: 'string', format: 'email'),
                        new OA\Property(property: 'password', type: 'string', minLength: 8),
                        new OA\Property(property: 'role', type: 'string', enum: ['coach', 'player']),
                        new OA\Property(property: 'team_id', type: 'string', format: 'uuid', nullable: true)
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Użytkownik zarejestrowany pomyślnie'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych')
        ]
    )]
    public function register(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'first_name' => ['required', 'string', 'max:255'],
                'last_name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
                'password' => ['required', 'string', 'min:8'],
                'role' => ['required', 'string', 'in:coach,player'],
                'team_id' => ['required_if:role,player,coach', 'nullable', 'uuid', 'exists:teams,id'],
            ]);

            $user = User::create([
                'first_name' => $validatedData['first_name'],
                'last_name' => $validatedData['last_name'],
                'email' => $validatedData['email'],
                'password_hash' => Hash::make($validatedData['password']),
                'role' => $validatedData['role'],
            ]);

            if (!empty($validatedData['team_id'])) {
                \Illuminate\Support\Facades\DB::table('team_members')->insert([
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'team_id' => $validatedData['team_id'],
                    'user_id' => $user->id,
                    'status' => 'pending',
                    'joined_at' => now(),
                ]);
            }

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
    #[OA\Post(
        path: '/api/login',
        summary: 'Logowanie użytkownika',
        responses: [
            new OA\Response(response: 200, description: 'Pomyślnie zalogowano')
        ]
    )]
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
    #[OA\Post(
        path: '/api/auth/logout',
        summary: 'Wylogowanie użytkownika',
        description: 'Zamyka sesję użytkownika i unieważnia token dostępu',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wylogowano pomyślnie')
        ]
    )]
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
    #[OA\Post(
        path: '/api/auth/refresh',
        summary: 'Odśwież token dostępu',
        description: 'Odświeża token dostępu przy użyciu refresh tokena',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/x-www-form-urlencoded',
                schema: new OA\Schema(
                    required: ['refresh_token'],
                    properties: [
                        new OA\Property(property: 'refresh_token', type: 'string')
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Tokeny pomyślnie odświeżone'),
            new OA\Response(response: 401, description: 'Token odświeżania jest nieważny lub wygasł')
        ]
    )]
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

    /**
     * Send password reset token.
     */
    #[OA\Post(
        path: '/api/auth/forgot-password',
        summary: 'Żądanie resetu hasła',
        description: 'Generuje token resetujący hasło i wysyła go (w środowisku deweloperskim token jest zwracany w odpowiedzi).',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/json',
                schema: new OA\Schema(
                    required: ['email'],
                    properties: [
                        new OA\Property(property: 'email', type: 'string', format: 'email')
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Link do resetu hasła został wysłany'),
            new OA\Response(response: 422, description: 'Błąd walidacji danych')
        ]
    )]
    public function forgotPassword(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'email' => ['required', 'string', 'email'],
            ]);

            $user = User::where('email', $validatedData['email'])->first();

            if (!$user) {
                return response()->json([
                    'message' => 'Jeśli konto z podanym adresem email istnieje, wysłano na nie instrukcje resetowania hasła.'
                ], 200);
            }

            $token = \Illuminate\Support\Str::random(60);

            \Illuminate\Support\Facades\DB::table('password_resets')->insert([
                'id' => \Illuminate\Support\Str::uuid(),
                'user_id' => $user->id,
                'token' => Hash::make($token),
                'expires_at' => now()->addMinutes(60),
                'used' => false,
            ]);

            // For development purposes, we return the token in the response
            return response()->json([
                'message' => 'Kod resetujący został wygenerowany pomyślnie!',
                'debug_token' => $token,
                'email' => $user->email
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Błąd walidacji danych.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Wystąpił błąd podczas generowania tokenu.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset the password using the token.
     */
    #[OA\Post(
        path: '/api/auth/reset-password',
        summary: 'Reset hasła',
        description: 'Ustawia nowe hasło na podstawie prawidłowego tokenu.',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'application/json',
                schema: new OA\Schema(
                    required: ['email', 'token', 'password'],
                    properties: [
                        new OA\Property(property: 'email', type: 'string', format: 'email'),
                        new OA\Property(property: 'token', type: 'string'),
                        new OA\Property(property: 'password', type: 'string', minLength: 8)
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Hasło zostało pomyślnie zmienione'),
            new OA\Response(response: 400, description: 'Nieprawidłowy lub wygasły token')
        ]
    )]
    public function resetPassword(Request $request)
    {
        try {
            $validatedData = $request->validate([
                'email' => ['required', 'string', 'email'],
                'token' => ['required', 'string'],
                'password' => ['required', 'string', 'min:8'],
            ]);

            $user = User::where('email', $validatedData['email'])->first();

            if (!$user) {
                return response()->json([
                    'message' => 'Nieprawidłowy adres email lub token.'
                ], 400);
            }

            $passwordReset = \Illuminate\Support\Facades\DB::table('password_resets')
                ->where('user_id', $user->id)
                ->where('used', false)
                ->where('expires_at', '>=', now())
                ->get()
                ->first(function ($reset) use ($validatedData) {
                    return Hash::check($validatedData['token'], $reset->token);
                });

            if (!$passwordReset) {
                return response()->json([
                    'message' => 'Nieprawidłowy lub wygasły token.'
                ], 400);
            }

            $user->password_hash = Hash::make($validatedData['password']);
            $user->save();

            \Illuminate\Support\Facades\DB::table('password_resets')
                ->where('id', $passwordReset->id)
                ->update(['used' => true]);

            return response()->json([
                'message' => 'Twoje hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.'
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Błąd walidacji danych.',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Wystąpił błąd podczas resetowania hasła.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
