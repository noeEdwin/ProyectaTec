<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\ProjectUpdate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreProjectUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');
        abort_unless($project instanceof Project, 404);

        Gate::authorize('create', [ProjectUpdate::class, $project]);

        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['missing'],
            'project_id' => ['missing'],
            'created_by' => ['missing'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
