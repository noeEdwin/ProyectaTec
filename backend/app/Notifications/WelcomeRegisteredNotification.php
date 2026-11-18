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

        return (new MailMessage)
            ->subject('Bienvenido a ProyectaTec')
            ->greeting("Hola, {$notifiable->name}")
            ->line('Tu cuenta en ProyectaTec se registró correctamente.')
            ->line("Correo registrado: {$notifiable->email}")
            ->action('Iniciar sesión en ProyectaTec', $loginUrl)
            ->line('Si no realizaste este registro, puedes ignorar este mensaje.');
    }
}
