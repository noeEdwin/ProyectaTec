<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePublicationReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $reporterId = $this->user()?->id;

        return [
            'id' => ['missing'],
            'reporter_id' => ['missing'],
            'status' => ['missing'],
            'project_id' => [
                'required_without:community_need_id', 'nullable', 'integer', 'prohibits:community_need_id',
                Rule::unique('publication_reports', 'project_id')->where('reporter_id', $reporterId),
            ],
            'community_need_id' => [
                'required_without:project_id', 'nullable', 'integer', 'prohibits:project_id',
                Rule::unique('publication_reports', 'community_need_id')->where('reporter_id', $reporterId),
            ],
            'reason' => ['required', 'string', Rule::in(['inappropriate', 'spam', 'misinformation', 'other'])],
            'details' => ['required_if:reason,other', 'nullable', 'string', 'max:1000'],
        ];
    }
}
