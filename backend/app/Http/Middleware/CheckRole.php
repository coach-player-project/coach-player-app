<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Restricts access based on provided application roles securely.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string ...$roles
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // 1. Sprawdź, czy w ogóle mamy dostępnego zalogowanego użytkownika w zapytaniu
        if (!$user) {
            return response()->json([
                'message' => 'Niezautoryzowany dostęp.'
            ], 401);
        }

        // 2. Jeśli tablica przewiduje pożądane role, skanujemy w poszukiwaniu idealnego dopasowania
        if (!empty($roles) && !in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Brak wymaganych uprawnień (Forbidden).'
            ], 403);
        }

        // 3. Pomyślny cykl weryfikacji przepuszcza żądanie dalej w objęcia konkretnego logarytmu na serwerze
        return $next($request);
    }
}
