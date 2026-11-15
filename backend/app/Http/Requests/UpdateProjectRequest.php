<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('update', $this->route('project'));

        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['missing'],
            'created_by' => ['missing'],
            'organization_id' => ['missing'],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'required', Rule::in(['draft', 'open', 'in_progress', 'completed', 'closed', 'withdrawn'])],
            'modality' => ['sometimes', 'nullable', 'string', 'max:255'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date'],
            'needs' => ['sometimes', 'array', 'max:10'],
            'needs.*.id' => ['sometimes', 'nullable', 'integer'],
            'needs.*.title' => ['required', 'string', 'min:3', 'max:255'],
            'needs.*.description' => ['nullable', 'string', 'max:1000'],
            'needs.*.required_profile' => ['nullable', 'string', 'max:255'],
            'needs.*.openings' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
