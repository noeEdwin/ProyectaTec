<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Notifications\Notification;

class ApplicationReviewedNotification extends Notification
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
            'event' => 'application_reviewed',
            'application_id' => $this->application->id,
            'project_id' => $this->application->project_id,
            'project_title' => $this->application->project?->title,
            'status' => $this->application->status,
            'reviewed_by' => $this->application->reviewed_by,
            'review_notes' => $this->application->review_notes,
        ];
    }
}
