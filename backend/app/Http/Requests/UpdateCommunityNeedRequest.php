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
            'category_id' => ['missing'],
            'project_id' => ['missing'],
            'organization_id' => ['missing'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'required', Rule::in(['draft', 'open', 'closed', 'withdrawn'])],
        ];
    }
}
