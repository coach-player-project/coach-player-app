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
}

