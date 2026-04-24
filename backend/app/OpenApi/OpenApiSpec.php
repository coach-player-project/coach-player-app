<?php

namespace App\OpenApi;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'Football App API'
)]
#[OA\Server(url: '/')]
#[OA\SecurityScheme(
    securityScheme: 'sanctum',
    type: 'apiKey',
    name: 'Authorization',
    in: 'header',
    description: 'Enter token in format (Bearer <token>)'
)]
final class OpenApiSpec
{
    #[OA\Get(
        path: '/api/user',
        summary: 'Pobierz dane zalogowanego użytkownika',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Dane użytkownika')
        ]
    )]
    public function getUser() {}

    #[OA\Get(
        path: '/api/admin/dashboard',
        summary: 'Panel administratora',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wiadomość z panelu admina')
        ]
    )]
    public function getAdminDashboard() {}

    #[OA\Get(
        path: '/api/coach/dashboard',
        summary: 'Panel trenera',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wiadomość z panelu trenera')
        ]
    )]
    public function getCoachDashboard() {}

    #[OA\Get(
        path: '/api/player/dashboard',
        summary: 'Panel zawodnika',
        security: [['sanctum' => []]],
        responses: [
            new OA\Response(response: 200, description: 'Wiadomość z panelu zawodnika')
        ]
    )]
    public function getPlayerDashboard() {}
}
