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

        $subject = 'Recuperación de contraseña — ProyectaTec';
        $greeting = "Hola, {$notifiable->name}";
        $actionText = 'Restablecer contraseña';

        return (new MailMessage)
            ->subject($subject)
            ->action($actionText, $resetUrl)
            ->view('emails.proyectatec', [
                'subject' => $subject,
                'eyebrow' => 'RECUPERACIÓN DE CUENTA',
                'greeting' => $greeting,
                'introLines' => [
                    'Recibimos una solicitud para restablecer la contraseña de tu cuenta en ProyectaTec.',
                ],
                'actionText' => $actionText,
                'actionUrl' => $resetUrl,
                'highlightText' => "Por tu seguridad, este enlace es de un solo uso y expirará en {$expireMinutes} minutos.",
                'outroLines' => [
                    'Si no solicitaste el cambio de contraseña, puedes ignorar este correo; tu cuenta seguirá protegida.',
                ],
            ]);
    }
}
