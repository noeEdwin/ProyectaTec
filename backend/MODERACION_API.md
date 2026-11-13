
# API de Moderación — ProyectaTec

## Sprint 6 — Issue #77

### Objetivo
Permitir la moderación administrativa de usuarios, proyectos
y necesidades comunitarias sin eliminar registros históricos.

## Seguridad

Las rutas administrativas requieren:
- Autenticación mediante Laravel Sanctum.
- Una cuenta activa.
- Un correo autorizado como administrador de plataforma,
  configurado en PROYECTATEC_ADMIN_EMAILS.

## 1. Moderar usuarios

PATCH /api/admin/users/{user}/status

Desactivar:
{"is_active": false}

Reactivar:
{"is_active": true}

Respuesta exitosa: 200 OK.

La desactivación revoca los tokens del usuario.
No se permite desactivar la propia cuenta administradora
ni moderar otras cuentas administradoras.

## 2. Moderar proyectos

PATCH /api/admin/projects/{project}/visibility

Ocultar:
{"is_hidden": true}

Restaurar:
{"is_hidden": false}

Respuesta exitosa: 200 OK.

La moderación conserva el estado original del proyecto.
Los proyectos ocultos no aparecen en consultas públicas
que utilizan el filtro publiclyVisible().

## 3. Moderar necesidades comunitarias

PATCH /api/admin/community-needs/{communityNeed}/visibility

Ocultar:
{"is_hidden": true}

Restaurar:
{"is_hidden": false}

Respuesta exitosa: 200 OK.

Las necesidades ocultas no aparecen en el listado público
ni en la consulta individual.

## 4. Resolver reportes de publicaciones

PATCH /api/admin/publication-reports/{report}

Marcar como revisado:

{"status": "reviewed", "decision_notes": "Se revisó y cumple las normas."}

Descartar el reporte:

{"status": "discarded", "decision_notes": "No describe una infracción."}

Devolver a pendiente (limpia la revisión):

{"status": "pending"}

Estados permitidos: pending, reviewed, discarded.

- decision_notes es obligatorio al revisar o descartar
  y admite hasta 1000 caracteres.
- Al revisar o descartar se registran reviewed_by y reviewed_at.
- Volver a pending elimina reviewed_by, reviewed_at y decision_notes.
- La resolución no oculta la publicación automáticamente;
  para ocultarla se usa el endpoint de visibilidad correspondiente.
- Solo un administrador de plataforma activo puede resolver reportes.

Respuesta exitosa: 200 OK con el reporte actualizado.

## 5. Restricciones adicionales

- Las cuentas desactivadas no pueden iniciar sesión.
- Las rutas privadas comprueban que la cuenta esté activa.
- Las publicaciones ocultas no aceptan nuevos reportes.
- Los registros no se eliminan físicamente.

## 6. Respuestas HTTP

- 200: operación realizada correctamente.
- 401: solicitud sin autenticación válida.
- 403: cuenta desactivada o sin autorización.
- 404: recurso inexistente o no visible públicamente.
- 422: datos de entrada inválidos.

## 7. Pruebas automatizadas

- AdminUserModerationTest
- AdminPublicationModerationTest
- PublicationVisibilityTest
- HiddenPublicationReportTest
- InactiveAccountAccessTest
- PublicationReportResolutionTest

También se ejecutan pruebas de regresión de autenticación,
publicaciones, reportes y necesidades comunitarias.

## 8. Integración con el frontend

Los endpoints responden en formato JSON y están preparados
para que las vistas administrativas del frontend los consuman.

La implementación visual del panel administrativo
corresponde a la integración con el frontend.
