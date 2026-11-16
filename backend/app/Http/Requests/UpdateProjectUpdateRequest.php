<?php

namespace App\Http\Requests;

use App\Models\Project;
use App\Models\ProjectUpdate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class UpdateProjectUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');
        $update = $this->route('update');

        abort_unless(
            $project instanceof Project && $update instanceof ProjectUpdate
                && (int) $update->project_id === (int) $project->id,
            404
        );

        Gate::authorize('update', $update);

        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['missing'],
            'project_id' => ['missing'],
            'created_by' => ['missing'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'progress' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $input = $this->all();

                if (! array_key_exists('title', $input)
                    && ! array_key_exists('description', $input)
                    && ! array_key_exists('progress', $input)) {
                    $validator->errors()->add('project_update', 'Envía al menos un campo editable.');
                }
            },
        ];
    }
}
