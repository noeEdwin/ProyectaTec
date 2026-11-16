<?php

namespace App\Http\Requests;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in([
                Application::STATUS_ACCEPTED,
                Application::STATUS_REJECTED,
            ])],
            'review_notes' => ['nullable', 'string', 'max:1000'],
            'role' => ['nullable', 'string', 'max:100'],
        ];
    }
}
