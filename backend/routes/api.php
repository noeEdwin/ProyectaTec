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

// --------------------------------------------------------------------------
// Rutas públicas (No requieren inicio de sesión)
// --------------------------------------------------------------------------

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Consulta el proyecto destacado para la vista de Inicio en React
Route::get('/proyectos/destacado', function () {
    // Intenta obtener el proyecto más reciente registrado en la base de datos
    $project = Project::latest()->first();

    // Si la base de datos aún no tiene proyectos creados, responde con la información base
    if (!$project) {
        return response()->json([
            'id' => 1,
            'titulo' => 'AgroTech Oaxaca',
            'subtitulo' => 'Café de Especialidad Pluma',
            'fase' => 'Fase 01',
            'estado' => 'Activo',
            'dias_restantes' => 24,
        ]);
    }

    // Devuelve los datos reales del proyecto consultado en PostgreSQL
    return response()->json([
        'id' => $project->id,
        'titulo' => $project->title ?? $project->name ?? 'AgroTech Oaxaca',
        'subtitulo' => $project->description ?? 'Café de Especialidad Pluma',
        'fase' => $project->phase ?? 'Fase 01',
        'estado' => $project->status ?? 'Activo',
        'dias_restantes' => $project->days_remaining ?? 24,
        'imagen_url' => $project->image ? asset('storage/' . $project->image) : null,
    ]);
});


// --------------------------------------------------------------------------
// Rutas protegidas mediante Laravel Sanctum (Requieren Bearer Token)
// --------------------------------------------------------------------------

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

    // Crear o actualizar perfil
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

    // Rutas del Módulo de Perfiles
    Route::get('/me/profile', [ProfileController::class, 'show']);
    Route::patch('/me/profile', [ProfileController::class, 'update']);
    Route::post('/profile', [ProfileController::class, 'update']);
});