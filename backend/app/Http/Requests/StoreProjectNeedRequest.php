<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreProjectNeedRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = Project::query()
            ->publiclyVisible()
            ->findOrFail($this->route('project'));

        Gate::authorize('addNeed', $project);
        $this->attributes->set('authorized_project', $project);

        return true;
    }

    public function rules(): array
    {
        return [
            'project_id' => ['missing'],
            'created_by' => ['missing'],
            'category_id' => ['missing'],
            'organization_id' => ['missing'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'required_profile' => ['nullable', 'string', 'max:255'],
            'openings' => ['nullable', 'integer', 'min:1', 'max:2147483647'],
            'status' => ['required', 'string', Rule::in(['open'])],
        ];
    }
}
