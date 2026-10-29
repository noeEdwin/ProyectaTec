<?php

use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Models\Project;
use App\Models\Organization;
use Illuminate\Support\Facades\Gate;
use App\Models\Application;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\OrganizationController;
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
    
    // Revisar solicitudes de participación
Route::patch('/applications/{application}', function (Request $request, Application $application) {

    Gate::authorize('update', $application);

    $data = $request->validate([
        'status' => ['required', 'in:accepted,rejected'],
    ]);

    $application->update([
        'status' => $data['status'],
        'reviewed_by' => $request->user()->id,
        'reviewed_at' => now(),
    ]);

    return response()->json($application);
});

    // Cerrar sesión
    Route::post('/logout', [AuthController::class, 'logout']);

    // Nueva ruta para crear o actualizar el perfil
    Route::post('/profile', [ProfileController::class, 'update']);

    // Crear una nueva organización y vincularla al usuario
    Route::post('/organizations', [OrganizationController::class, 'store']);

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
