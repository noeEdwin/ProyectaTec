<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommunityNeedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'created_by' => ['missing'],
            'project_id' => ['missing'],
            'organization_id' => ['missing'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'status' => ['required', 'string', Rule::in(['open'])],
            'location' => ['nullable', 'string', 'max:255'],
        ];
    }
}
