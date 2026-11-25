<?php

use App\Http\Controllers\AdminPublicationModerationController;
use App\Http\Controllers\AdminUserModerationController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommunityNeedController;
use App\Http\Controllers\MyPublicationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectNeedController;
use App\Http\Controllers\ProjectUpdateController;
use App\Http\Controllers\PublicationMediaController;
use App\Http\Controllers\PublicationReportController;
use App\Http\Controllers\PublicationStatsController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\ProjectCommentController;
use App\Http\Controllers\ProjectFileController;
use App\Http\Middleware\EnsureActiveUser;
use App\Models\Category;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

// --------------------------------------------------------------------------
// Rutas públicas (no requieren inicio de sesión)
// --------------------------------------------------------------------------

Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:auth');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth');

Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
    ->middleware('throttle:auth');

Route::post('/reset-password', [AuthController::class, 'resetPassword'])
    ->middleware('throttle:auth');

Route::get('/organizations', [OrganizationController::class, 'publicIndex']);

Route::get('/organizations/catalog', [OrganizationController::class, 'catalog']);

Route::get('/profiles/{profile}', [ProfileController::class, 'showPublic'])
    ->whereNumber('profile');

Route::get('/organizations/{organization}', [OrganizationController::class, 'showPublic'])
    ->whereNumber('organization');

Route::get('/projects', [ProjectController::class, 'index']);

Route::get('/projects/{project}', [ProjectController::class, 'show'])
    ->whereNumber('project');

Route::get('/projects/{project}/needs', [ProjectNeedController::class, 'index'])
    ->whereNumber('project');

Route::get('/projects/{project}/needs/{need}', [ProjectNeedController::class, 'show'])
    ->whereNumber('project')
    ->whereNumber('need');

// Consultar comentarios de un avance
Route::get(
    '/projects/{project}/updates/{update}/comments',
    [ProjectCommentController::class, 'index']
)->whereNumber('project')->whereNumber('update');

// Consultar participantes activos de un proyecto
Route::get(
    '/projects/{project}/members',
    [ProjectMemberController::class, 'index']
)->whereNumber('project');

// --------------------------------------------------------------------------
// Rutas públicas de evidencias de proyectos
// --------------------------------------------------------------------------

// Consultar evidencias de un proyecto
Route::get(
    '/projects/{project}/files',
    [ProjectFileController::class, 'index']
)->whereNumber('project');

// Consultar evidencias de un avance
Route::get(
    '/projects/{project}/updates/{update}/files',
    [ProjectFileController::class, 'index']
)->whereNumber('project')->whereNumber('update');

// Descargar evidencias de proyectos públicos
Route::get(
    '/projects/{project}/files/{file}/download',
    [ProjectFileController::class, 'download']
)->whereNumber('project')->whereNumber('file');

// --------------------------------------------------------------------------
// Otras rutas públicas
// --------------------------------------------------------------------------

Route::get('/community-needs', [CommunityNeedController::class, 'index']);

Route::get(
    '/community-needs/{communityNeed}',
    [CommunityNeedController::class, 'show']
)->whereNumber('communityNeed');

Route::get('/categories', fn () => response()->json([
    'categories' => Category::query()
        ->orderBy('name')
        ->get(['id', 'name']),
]));

// Estadísticas públicas para la portada de inicio en React
Route::get('/estadisticas/inicio', function () {
    $proyectosActivos = Project::publiclyVisible()->count();
    $organizaciones = \App\Models\Organization::query()
        ->where('approval_status', 'approved')
        ->count();

    return response()->json([
        'impacto' => '100%',
        'sectores' => 3,
        'proyectos_activos' => $proyectosActivos,
        'organizaciones' => $organizaciones,
    ]);
});

// Consulta del proyecto destacado para la vista de inicio en React
Route::get('/proyectos/destacado', function () {
    $project = Project::publiclyVisible()->latest()->first();

    // Si no hay proyectos creados, responde con información base.
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
        'imagen_url' => $project->image
            ? asset('storage/'.$project->image)
            : null,
    ]);
});

// --------------------------------------------------------------------------
// Rutas protegidas mediante Laravel Sanctum
// --------------------------------------------------------------------------

Route::middleware([
    'auth:sanctum',
    EnsureActiveUser::class,
])->group(function () {

    // ----------------------------------------------------------------------
    // Evidencias: solo usuarios autenticados y autorizados pueden subir
    // ----------------------------------------------------------------------

    Route::post(
        '/projects/{project}/files',
        [ProjectFileController::class, 'store']
    )->whereNumber('project');

    Route::post(
        '/projects/{project}/updates/{update}/files',
        [ProjectFileController::class, 'store']
    )->whereNumber('project')->whereNumber('update');

    // ----------------------------------------------------------------------
    // Comentarios de avances
    // ----------------------------------------------------------------------

    Route::post(
        '/projects/{project}/updates/{update}/comments',
        [ProjectCommentController::class, 'store']
    )->whereNumber('project')->whereNumber('update');

    // ----------------------------------------------------------------------
    // Moderación de usuarios
    // ----------------------------------------------------------------------

    Route::get(
        '/admin/users',
        [AdminUserModerationController::class, 'index']
    );

    Route::get(
        '/admin/users/{user}',
        [AdminUserModerationController::class, 'show']
    )->whereNumber('user');

    Route::patch(
        '/admin/users/{user}/status',
        [AdminUserModerationController::class, 'updateStatus']
    )->whereNumber('user');

    // ----------------------------------------------------------------------
    // Moderación de publicaciones
    // ----------------------------------------------------------------------

    Route::get(
        '/admin/publications',
        [AdminPublicationModerationController::class, 'index']
    );

    Route::get(
        '/admin/publications/{type}/{id}',
        [AdminPublicationModerationController::class, 'show']
    )->whereIn('type', ['proyecto', 'necesidad'])
        ->whereNumber('id');

    Route::patch(
        '/admin/projects/{project}/visibility',
        [AdminPublicationModerationController::class, 'updateProjectVisibility']
    )->whereNumber('project');

    Route::patch(
        '/admin/community-needs/{communityNeed}/visibility',
        [AdminPublicationModerationController::class, 'updateCommunityNeedVisibility']
    )->whereNumber('communityNeed');

    // ----------------------------------------------------------------------
    // Publicaciones propias
    // ----------------------------------------------------------------------

    Route::get(
        '/me/publications',
        [MyPublicationController::class, 'index']
    );

    Route::get(
        '/me/publications/{type}/{id}',
        [MyPublicationController::class, 'show']
    )->whereNumber('id');

    Route::post(
        '/publications/{type}/{id}/media',
        [PublicationMediaController::class, 'update']
    )
        ->whereIn(
            'type',
            ['proyecto', 'project', 'necesidad', 'community_need']
        )
        ->whereNumber('id');

    // ----------------------------------------------------------------------
    // Proyectos y avances
    // ----------------------------------------------------------------------

    Route::post(
        '/projects/{project}/needs',
        [ProjectNeedController::class, 'store']
    )->whereNumber('project');

    Route::get(
        '/projects/{project}/updates',
        [ProjectUpdateController::class, 'index']
    )->whereNumber('project');

    Route::get(
        '/projects/{project}/updates/{update}',
        [ProjectUpdateController::class, 'show']
    )->whereNumber('project')
        ->whereNumber('update');

    Route::post(
        '/projects/{project}/updates',
        [ProjectUpdateController::class, 'store']
    )->whereNumber('project');

    Route::patch(
        '/projects/{project}/updates/{update}',
        [ProjectUpdateController::class, 'update']
    )->whereNumber('project')
        ->whereNumber('update');

    Route::post(
        '/community-needs',
        [CommunityNeedController::class, 'store']
    );

    Route::post(
        '/projects',
        [ProjectController::class, 'store']
    );

    // ----------------------------------------------------------------------
    // Perfil del usuario autenticado
    // ----------------------------------------------------------------------

    Route::get(
        '/me/profile',
        [ProfileController::class, 'showOwn']
    );

    Route::patch(
        '/me/profile',
        [ProfileController::class, 'update']
    );

    Route::post(
        '/me/profile/avatar',
        [ProfileController::class, 'uploadAvatar']
    );

    Route::get(
        '/me/organizations',
        [OrganizationController::class, 'indexOwn']
    );

    Route::get(
        '/me/organization-role-requests',
        [OrganizationController::class, 'myRoleRequests']
    );

    // ----------------------------------------------------------------------
    // Administración de organizaciones
    // ----------------------------------------------------------------------

    Route::get(
        '/admin/organizations/pending',
        [OrganizationController::class, 'pendingApprovals']
    );

    Route::post(
        '/admin/organizations',
        [OrganizationController::class, 'adminCreate']
    );

    Route::patch(
        '/admin/organizations/{organization}/approval',
        [OrganizationController::class, 'reviewApproval']
    )->whereNumber('organization');

    Route::post(
        '/organizations/{organization}/role-request',
        [OrganizationController::class, 'requestRole']
    )->whereNumber('organization');

    Route::get(
        '/organizations/{organization}/member-requests',
        [OrganizationController::class, 'memberRequests']
    )->whereNumber('organization');

    Route::patch(
        '/organizations/{organization}/member-requests/{membership}',
        [OrganizationController::class, 'reviewMemberRequest']
    )->whereNumber('organization')
        ->whereNumber('membership');

    Route::patch(
        '/organizations/{organization}/affiliation-requests/{profile}',
        [OrganizationController::class, 'reviewAffiliationRequest']
    )->whereNumber('organization')
        ->whereNumber('profile');

    Route::get(
        '/admin/profiles/affiliations/pending',
        [ProfileController::class, 'pendingAffiliations']
    );

    Route::patch(
        '/admin/profiles/{profile}/affiliation',
        [ProfileController::class, 'reviewAffiliation']
    )->whereNumber('profile');

    // ----------------------------------------------------------------------
    // Editor de perfil de React
    // ----------------------------------------------------------------------

    Route::get(
        '/profile',
        [ProfileController::class, 'show']
    );

    Route::post(
        '/profile',
        [ProfileController::class, 'update']
    );

    Route::patch(
        '/profile',
        [ProfileController::class, 'update']
    );

    // ----------------------------------------------------------------------
    // Edición de publicaciones
    // ----------------------------------------------------------------------

    Route::patch(
        '/projects/{project}',
        [ProjectController::class, 'update']
    )->whereNumber('project');

    Route::patch(
        '/community-needs/{communityNeed}',
        [CommunityNeedController::class, 'update']
    )->whereNumber('communityNeed');

    // ----------------------------------------------------------------------
    // Reportes de publicaciones
    // ----------------------------------------------------------------------

    Route::post(
        '/publication-reports',
        [PublicationReportController::class, 'store']
    );

    Route::get(
        '/admin/publication-reports',
        [PublicationReportController::class, 'index']
    );

    Route::patch(
        '/admin/publication-reports/{report}',
        [PublicationReportController::class, 'resolve']
    )->whereNumber('report');

    Route::get(
        '/admin/publication-stats',
        [PublicationStatsController::class, 'index']
    );

    // ----------------------------------------------------------------------
    // Edición de organizaciones
    // ----------------------------------------------------------------------

    Route::patch(
        '/organizations/{organization}',
        [OrganizationController::class, 'update']
    )->whereNumber('organization');

    Route::post(
        '/organizations/{organization}/resubmit',
        [OrganizationController::class, 'resubmit']
    )->whereNumber('organization');

    Route::post(
        '/organizations/{organization}/logo',
        [OrganizationController::class, 'uploadLogo']
    )->whereNumber('organization');

    // ----------------------------------------------------------------------
    // Solicitudes de vinculación y participación
    // ----------------------------------------------------------------------

    Route::post(
        '/projects/{project}/applications',
        [ApplicationController::class, 'store']
    )->whereNumber('project');

    Route::get(
        '/projects/{project}/applications',
        [ApplicationController::class, 'indexByProject']
    )->whereNumber('project');

    Route::get(
        '/me/applications',
        [ApplicationController::class, 'indexOwn']
    );

    Route::get(
        '/applications/{application}',
        [ApplicationController::class, 'show']
    )->whereNumber('application');

    Route::patch(
        '/applications/{application}',
        [ApplicationController::class, 'review']
    )->whereNumber('application');

    // ----------------------------------------------------------------------
    // Notificaciones
    // ----------------------------------------------------------------------

    Route::get(
        '/me/notifications',
        [NotificationController::class, 'index']
    );

    Route::patch(
        '/me/notifications/read-all',
        [NotificationController::class, 'markAllAsRead']
    );

    Route::patch(
        '/me/notifications/{notification}/read',
        [NotificationController::class, 'markAsRead']
    );

    // ----------------------------------------------------------------------
    // Cerrar sesión
    // ----------------------------------------------------------------------

    Route::post(
        '/logout',
        [AuthController::class, 'logout']
    );

    // Crear una nueva organización
    Route::post(
        '/organizations',
        [OrganizationController::class, 'store']
    );

    // ----------------------------------------------------------------------
    // Información del usuario autenticado
    // ----------------------------------------------------------------------

    Route::get('/me', function (Request $request) {
        $user = $request->user();
        $avatarPath = $user->profile?->avatar_path;

        $adminEmails = array_map(
            'strtolower',
            config('services.proyectatec.admin_emails', [])
        );

        return response()->json($user->only([
            'id',
            'name',
            'email',
            'account_type',
        ]) + [
            'avatar_url' => $avatarPath ? Storage::disk('public')->url($avatarPath) : null,
            'can_manage_platform' => in_array(
                strtolower($user->email),
                $adminEmails,
                true
            ),
            'has_pending_institution_approval' =>
                $user->hasPendingNewInstitution(),
        ]);
    });
});
