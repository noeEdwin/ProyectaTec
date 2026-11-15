<?php

namespace App\Http\Requests;

use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommunityNeedRequest extends FormRequest
{
    public function authorize(): Response|bool
    {
        if ($this->user()?->hasPendingNewInstitution()) {
            return Response::deny('Tu institución aún está pendiente de aprobación por administración. Podrás publicar cuando sea verificada.');
        }

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
            'requirements' => ['sometimes', 'array', 'max:10'],
            'requirements.*.title' => ['required', 'string', 'min:3', 'max:255'],
            'requirements.*.description' => ['nullable', 'string', 'max:1000'],
            'requirements.*.required_profile' => ['nullable', 'string', 'max:255'],
            'requirements.*.openings' => ['required', 'integer', 'min:1', 'max:100'],
        ];
    }
}
