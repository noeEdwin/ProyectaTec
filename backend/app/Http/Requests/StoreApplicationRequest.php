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
            'tipo_apoyo' => ['nullable', 'string', 'max:120'],
            'disponibilidad' => ['nullable', 'string', 'max:255'],
            'availability' => ['nullable', 'string', 'max:255'],
            'expectativas' => ['nullable', 'string', 'max:1000'],
            'portafolio_url' => ['nullable', 'url:http,https', 'max:500'],
            'github_url' => ['nullable', 'url:http,https', 'max:500'],
            'linkedin_url' => ['nullable', 'url:http,https', 'max:500'],
            'cv_pdf' => ['nullable', 'file', 'mimes:pdf', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'cv_pdf.mimes' => 'El currículum debe estar en formato PDF.',
            'cv_pdf.max' => 'El currículum PDF no puede superar los 5 MB.',
            'portafolio_url.url' => 'Ingresa un enlace de portafolio válido con http:// o https://.',
            'github_url.url' => 'Ingresa un enlace de GitHub válido con http:// o https://.',
            'linkedin_url.url' => 'Ingresa un enlace de LinkedIn válido con http:// o https://.',
        ];
    }
}
