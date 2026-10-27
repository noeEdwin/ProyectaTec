
<?php

use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Models\Project;
use App\Models\Organization;
use Illuminate\Support\Facades\Gate;

// Rutas públicas de autenticación
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Rutas protegidas mediante Laravel Sanctum
Route::middleware('auth:sanctum')->group(function () {

    // Editar un proyecto
    Route::patch('/projects/{project}', function (Request $request, Project $project) {

        Gate::authorize('update', $project);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $project->update($data);

        return response()->json($project);
    });

    // Editar una organización
    Route::patch('/organizations/{organization}', function (Request $request, Organization $organization) {

        Gate::authorize('update', $organization);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $organization->update($data);

        return response()->json($organization);
    });

    // Cerrar sesión
    Route::post('/logout', [AuthController::class, 'logout']);

    // Consultar información del usuario autenticado
    Route::get('/me', function (Request $request) {

        return response()->json(
            $request->user()->only([
                'id',
                'name',
                'email',
                'account_type',
            ])
        );
    });

});
