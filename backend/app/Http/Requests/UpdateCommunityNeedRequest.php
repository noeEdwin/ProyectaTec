<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateCommunityNeedRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('update', $this->route('communityNeed'));

        return true;
    }

    public function rules(): array
    {
        return [
            'id' => ['missing'],
            'created_by' => ['missing'],
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'project_id' => ['missing'],
            'organization_id' => ['missing'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'required', Rule::in(['draft', 'open', 'closed', 'withdrawn'])],
            'requirements' => ['sometimes', 'array', 'max:10'],
            'requirements.*.title' => ['required', 'string', 'min:3', 'max:255'],
            'requirements.*.description' => ['nullable', 'string', 'max:1000'],
            'requirements.*.required_profile' => ['nullable', 'string', 'max:255'],
            'requirements.*.openings' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
