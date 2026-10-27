<?php
use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use App\Models\Project;
use Illuminate\Support\Facades\Gate;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::patch('/projects/{project}', function (Request $request, Project $project) {
    Gate::authorize('update', $project);

    $data = $request->validate([
        'title' => ['required', 'string', 'max:255'],
    ]);

    $project->update($data);

    return response()->json($project);
});
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', function (Request $request) {
    return response()->json(
        $request->user()->only([
            'id',
            'name',
            'email',
            'account_type'
        ])
    );
});
});
