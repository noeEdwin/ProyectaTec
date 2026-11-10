<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommunityNeedController;
use App\Http\Controllers\MyPublicationController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectNeedController;
use App\Http\Controllers\PublicationReportController;
use App\Http\Controllers\PublicationStatsController;
use App\Models\Application;
use App\Models\Category;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;

// --------------------------------------------------------------------------
// Rutas públicas (No requieren inicio de sesión)
// --------------------------------------------------------------------------

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/organizations/catalog', [OrganizationController::class, 'catalog']);
// Consultar un perfil público por su identificador
Route::get('/profiles/{profile}', [ProfileController::class, 'showPublic'])
    ->whereNumber('profile');
// Consultar información pública de una organización
Route::get('/organizations/{organization}', [OrganizationController::class, 'showPublic'])
    ->whereNumber('organization');
Route::get('/projects', [ProjectController::class, 'index']);
Route::get('/projects/{project}', [ProjectController::class, 'show'])->whereNumber('project');
Route::get('/projects/{project}/needs', [ProjectNeedController::class, 'index'])->whereNumber('project');
Route::get('/projects/{project}/needs/{need}', [ProjectNeedController::class, 'show'])->whereNumber('project')->whereNumber('need');
Route::get('/community-needs', [CommunityNeedController::class, 'index']);
Route::get('/community-needs/{communityNeed}', [CommunityNeedController::class, 'show'])->whereNumber('communityNeed');
Route::get('/categories', fn () => response()->json([
    'categories' => Category::query()->orderBy('name')->get(['id', 'name']),
]));
// Consulta el proyecto destacado para la vista de Inicio en React
Route::get('/proyectos/destacado', function () {
    $project = Project::publiclyVisible()->latest()->first();

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
    Route::get('/me/publications', [MyPublicationController::class, 'index']);
    Route::get('/me/publications/{type}/{id}', [MyPublicationController::class, 'show'])
        ->whereNumber('id');
    Route::post('/projects/{project}/needs', [ProjectNeedController::class, 'store'])->whereNumber('project');
    Route::post('/community-needs', [CommunityNeedController::class, 'store']);
    Route::post('/projects', [ProjectController::class, 'store']);
    // Consultar el perfil del usuario autenticado
    Route::get('/me/profile', [ProfileController::class, 'showOwn']);
    Route::patch('/me/profile', [ProfileController::class, 'update']);
    Route::post('/me/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::get('/me/organizations', [OrganizationController::class, 'indexOwn']);
    Route::get('/admin/organizations/pending', [OrganizationController::class, 'pendingApprovals']);
    Route::patch('/admin/organizations/{organization}/approval', [OrganizationController::class, 'reviewApproval'])
        ->whereNumber('organization');
    Route::get('/admin/profiles/affiliations/pending', [ProfileController::class, 'pendingAffiliations']);
    Route::patch('/admin/profiles/{profile}/affiliation', [ProfileController::class, 'reviewAffiliation'])
        ->whereNumber('profile');

    // Rutas del perfil consumidas por el editor React
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::patch('/profile', [ProfileController::class, 'update']);
    // Ampliación de la ruta de edición existente; conserva la misma URL.
    Route::patch('/projects/{project}', [ProjectController::class, 'update'])->whereNumber('project');
    Route::patch('/community-needs/{communityNeed}', [CommunityNeedController::class, 'update'])->whereNumber('communityNeed');
    Route::post('/publication-reports', [PublicationReportController::class, 'store']);
    Route::get('/admin/publication-reports', [PublicationReportController::class, 'index']);
    Route::get('/admin/publication-stats', [PublicationStatsController::class, 'index']);

    // Editar una organización
    Route::patch('/organizations/{organization}', [OrganizationController::class, 'update'])
        ->whereNumber('organization');
    Route::post('/organizations/{organization}/resubmit', [OrganizationController::class, 'resubmit'])
        ->whereNumber('organization');
    Route::post('/organizations/{organization}/logo', [OrganizationController::class, 'uploadLogo'])
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
        $user = $request->user();
        $adminEmails = array_map('strtolower', config('services.proyectatec.admin_emails', []));

        return response()->json($user->only([
            'id', 'name', 'email', 'account_type',
        ]) + [
            'can_manage_platform' => in_array(strtolower($user->email), $adminEmails, true),
        ]);
    });
});
