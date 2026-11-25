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
        $minDate = now()->subYears(5)->toDateString();
        $maxDate = now()->addYears(10)->toDateString();

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
            'starts_at' => ['sometimes', 'nullable', 'date', "after_or_equal:{$minDate}", "before_or_equal:{$maxDate}"],
            'ends_at' => ['sometimes', 'nullable', 'date', "after_or_equal:{$minDate}", "before_or_equal:{$maxDate}"],
            'needs' => ['sometimes', 'array', 'max:10'],
            'needs.*.id' => [
                'sometimes',
                'nullable',
                'integer',
                'distinct',
                Rule::exists('project_needs', 'id')->where('project_id', $this->route('project')->id),
            ],
            'needs.*.title' => ['required', 'string', 'min:3', 'max:255'],
            'needs.*.description' => ['nullable', 'string', 'max:1000'],
            'needs.*.required_profile' => ['nullable', 'string', 'max:255'],
            'needs.*.openings' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'starts_at.after_or_equal' => 'La fecha de inicio no puede ser anterior a hace 5 años.',
            'starts_at.before_or_equal' => 'La fecha de inicio no puede superar 10 años a futuro.',
            'ends_at.after_or_equal' => 'La fecha de fin no puede ser anterior a hace 5 años.',
            'ends_at.before_or_equal' => 'La fecha de fin no puede superar 10 años a futuro.',
        ];
    }
}
