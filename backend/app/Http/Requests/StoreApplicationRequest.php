<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'id' => ['missing'],
            'user_id' => ['missing'],
            'project_id' => ['missing'],
            'status' => ['missing'],
            'reviewed_by' => ['missing'],
            'reviewed_at' => ['missing'],
            'review_notes' => ['missing'],
            'project_need_id' => ['nullable', 'integer', 'min:1'],
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
