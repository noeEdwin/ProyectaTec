<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Notifications\Notification;

class ApplicationSubmittedNotification extends Notification
{
    public function __construct(
        private readonly Application $application
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'event' => 'application_submitted',
            'application_id' => $this->application->id,
            'project_id' => $this->application->project_id,
            'project_title' => $this->application->project?->title,
            'project_need_id' => $this->application->project_need_id,
            'applicant_id' => $this->application->user_id,
            'applicant_name' => $this->application->user?->name,
            'status' => $this->application->status,
        ];
    }
}
