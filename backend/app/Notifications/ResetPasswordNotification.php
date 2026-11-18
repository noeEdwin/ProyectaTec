<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(
        private readonly string $token
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $baseUrl = rtrim((string) config('app.url'), '/');
        $resetUrl = $baseUrl.'/restablecer-contrasena?token='.urlencode($this->token).'&email='.urlencode($notifiable->getEmailForPasswordReset());
        $expireMinutes = (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

        return (new MailMessage)
            ->subject('Recuperación de contraseña — ProyectaTec')
            ->greeting("Hola, {$notifiable->name}")
            ->line('Recibimos una solicitud para restablecer la contraseña de tu cuenta en ProyectaTec.')
            ->action('Restablecer contraseña', $resetUrl)
            ->line("Este enlace expirará en {$expireMinutes} minutos.")
            ->line('Si no solicitaste el cambio, no es necesario realizar ninguna acción.');
    }
}
