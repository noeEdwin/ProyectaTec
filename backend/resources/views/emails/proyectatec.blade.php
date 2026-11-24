<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ $subject ?? 'ProyectaTec' }}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f6f8;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f6f8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(15,23,42,0.05);">
          <!-- Encabezado con identidad ProyectaTec -->
          <tr>
            <td style="background-color:#111827;padding:24px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                    ProyectaTec<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#f59e0b;margin-left:3px;vertical-align:baseline;"></span>
                  </td>
                  <td align="right" style="font-size:11px;font-weight:700;color:#fbbf24;letter-spacing:0.08em;text-transform:uppercase;">
                    {{ $eyebrow ?? 'NOTIFICACIÓN' }}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Barra superior de acento -->
          <tr>
            <td style="height:4px;background-color:#0f4c5c;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Contenido principal -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:#111827;">
                {{ $greeting }}
              </h1>

              @foreach ($introLines as $line)
                <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#475569;">
                  {{ $line }}
                </p>
              @endforeach

              @if (!empty($actionText) && !empty($actionUrl))
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0;">
                  <tr>
                    <td align="center" style="border-radius:999px;background-color:#0f4c5c;">
                      <a href="{{ $actionUrl }}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                        {{ $actionText }}
                      </a>
                    </td>
                  </tr>
                </table>
              @endif

              @if (!empty($highlightText))
                <div style="margin:0 0 18px;padding:14px 16px;background-color:#f8fafc;border-left:4px solid #f59e0b;border-radius:8px;font-size:13px;line-height:1.55;color:#334155;">
                  {{ $highlightText }}
                </div>
              @endif

              @foreach ($outroLines as $line)
                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#64748b;">
                  {{ $line }}
                </p>
              @endforeach

              <p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#334155;font-weight:600;">
                Atentamente,<br>
                <span style="color:#0f4c5c;">Equipo ProyectaTec</span>
              </p>
            </td>
          </tr>

          <!-- Enlace alternativo en español -->
          @if (!empty($actionText) && !empty($actionUrl))
            <tr>
              <td style="padding:18px 32px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:#64748b;">
                  Si tienes problemas para hacer clic en el botón «{{ $actionText }}», copia y pega la siguiente dirección en tu navegador web:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all;">
                  <a href="{{ $actionUrl }}" target="_blank" rel="noopener noreferrer" style="color:#0f4c5c;text-decoration:underline;">{{ $actionUrl }}</a>
                </p>
              </td>
            </tr>
          @endif
        </table>

        <!-- Pie de página -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;">
          <tr>
            <td align="center" style="padding:18px 16px 0;font-size:12px;line-height:1.5;color:#94a3b8;">
              © 2026 ProyectaTec · Instituto Tecnológico de Oaxaca. Todos los derechos reservados.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
