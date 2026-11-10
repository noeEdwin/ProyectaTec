<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveUser
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(
            $request->user()?->is_active === true,
            403,
            'Esta cuenta está desactivada.'
        );

        return $next($request);
    }
}
