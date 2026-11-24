<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeRegisteredNotification extends Notification
{
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $loginUrl = rtrim((string) config('app.url'), '/').'/acceso';

        $subject = 'Bienvenido a ProyectaTec';
        $actionText = 'Iniciar sesión en ProyectaTec';

        return (new MailMessage)
            ->subject($subject)
            ->action($actionText, $loginUrl)
            ->view('emails.proyectatec', [
                'subject' => $subject,
                'eyebrow' => 'BIENVENIDA',
                'greeting' => "Hola, {$notifiable->name}",
                'introLines' => [
                    'Tu cuenta en ProyectaTec se registró correctamente. Ya puedes explorar proyectos, necesidades comunitarias y organizaciones de Oaxaca.',
                ],
                'actionText' => $actionText,
                'actionUrl' => $loginUrl,
                'highlightText' => "Correo registrado: {$notifiable->email}",
                'outroLines' => [
                    'Si no realizaste este registro, puedes ignorar este mensaje.',
                ],
            ]);
    }
}
