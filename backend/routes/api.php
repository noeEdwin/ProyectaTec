<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Models\Application;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

// --------------------------------------------------------------------------
// Rutas públicas (No requieren inicio de sesión)
// --------------------------------------------------------------------------

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
// Consultar un perfil público por su identificador
Route::get('/profiles/{profile}', [ProfileController::class, 'showPublic'])
    ->whereNumber('profile');
// Consultar información pública de una organización
Route::get('/organizations/{organization}', [OrganizationController::class, 'showPublic'])
    ->whereNumber('organization');
// Consulta el proyecto destacado para la vista de Inicio en React
Route::get('/proyectos/destacado', function () {
    $project = Project::latest()->first();

    // Si la base de datos aún no tiene proyectos creados, responde con la información base
    if (! $project) {
        return response()->json([
            'id' => 1,
            'titulo' => 'AgroTech Oaxaca',
            'subtitulo' => 'Café de Especialidad Pluma',
            'fase' => 'Fase 01',
            'estado' => 'Activo',
            'dias_restantes' => 24,
        ]);
    }

    return response()->json([
        'id' => $project->id,
        'titulo' => $project->title ?? $project->name ?? 'AgroTech Oaxaca',
        'subtitulo' => $project->description ?? 'Café de Especialidad Pluma',
        'fase' => $project->phase ?? 'Fase 01',
        'estado' => $project->status ?? 'Activo',
        'dias_restantes' => $project->days_remaining ?? 24,
        'imagen_url' => $project->image ? asset('storage/'.$project->image) : null,
    ]);
});

// --------------------------------------------------------------------------
// Rutas protegidas mediante Laravel Sanctum (Requieren Bearer Token)
// --------------------------------------------------------------------------

Route::middleware('auth:sanctum')->group(function () {
    // Consultar el perfil del usuario autenticado
    Route::get('/me/profile', [ProfileController::class, 'showOwn']);
    Route::patch('/me/profile', [ProfileController::class, 'update']);
    Route::get('/me/organizations', [OrganizationController::class, 'indexOwn']);

    // Rutas del perfil consumidas por el editor React
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::patch('/profile', [ProfileController::class, 'update']);
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
    Route::patch('/organizations/{organization}', [OrganizationController::class, 'update'])
        ->whereNumber('organization');

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
