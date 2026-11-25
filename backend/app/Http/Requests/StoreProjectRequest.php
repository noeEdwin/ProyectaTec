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
        $minDate = now()->subYears(5)->toDateString();
        $maxDate = now()->addYears(10)->toDateString();

        return [
            'created_by' => ['missing'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'status' => ['required', Rule::in(['open', 'in_progress', 'completed'])],
            'modality' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date', "after_or_equal:{$minDate}", "before_or_equal:{$maxDate}"],
            'ends_at' => [
                'nullable',
                'date',
                "after_or_equal:{$minDate}",
                "before_or_equal:{$maxDate}",
                Rule::when($this->filled('starts_at'), ['after_or_equal:starts_at']),
            ],
            'needs' => ['sometimes', 'array', 'max:10'],
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
            'ends_at.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio y no anterior a hace 5 años.',
            'ends_at.before_or_equal' => 'La fecha de fin no puede superar 10 años a futuro.',
        ];
    }
}
