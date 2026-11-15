<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Project::class);
    }

    public function rules(): array
    {
        return [
            'created_by' => ['missing'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'status' => ['required', Rule::in(['open', 'in_progress', 'completed'])],
            'modality' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', Rule::when($this->filled('starts_at'), ['after_or_equal:starts_at'])],
            'needs' => ['sometimes', 'array', 'max:10'],
            'needs.*.title' => ['required', 'string', 'min:3', 'max:255'],
            'needs.*.description' => ['nullable', 'string', 'max:1000'],
            'needs.*.required_profile' => ['nullable', 'string', 'max:255'],
            'needs.*.openings' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
