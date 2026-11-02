# API de Perfiles y Organizaciones - ProyectaTec

## Información general

- Actividad: 3.11.2 - Crear API para consultar y editar perfiles en Laravel
- Issue: #49
- Responsable: EdsaiGarrey
- Rama: feature/api-perfiles-laravel
- Tecnologías: Laravel, Sanctum, PostgreSQL y Postman

## Endpoints implementados

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| GET | /api/me/profile | Bearer Token | Consultar perfil propio |
| PATCH | /api/me/profile | Bearer Token | Actualizar perfil propio |
| POST | /api/profile | Bearer Token | Crear o actualizar perfil propio |
| GET | /api/profiles/{profile} | Pública | Consultar perfil público |
| GET | /api/organizations/{organization} | Pública | Consultar organización pública |
| POST | /api/organizations | Bearer Token | Crear organización |
| PATCH | /api/organizations/{organization} | Bearer Token y permisos | Editar organización |

## Validación y seguridad

La actualización de perfiles requiere display_name y permite description, phone, location, institution y field_of_study.

La consulta pública de perfiles y organizaciones no expone teléfonos, correos electrónicos ni credenciales.

La edición de organizaciones está protegida mediante Laravel Sanctum y una política que verifica el rol admin y el estado active en organization_members.

Los usuarios solo pueden modificar su propio perfil mediante los endpoints de perfil autenticado.

## Respuestas HTTP comprobadas

| Código | Significado |
|---|---|
| 200 | Consulta o actualización exitosa |
| 201 | Organización creada |
| 401 | Usuario no autenticado |
| 403 | Usuario sin permisos |
| 404 | Recurso inexistente |
| 422 | Datos que no cumplen la validación |

## Pruebas realizadas

Se utilizaron peticiones reales de Postman para comprobar los endpoints.

Pruebas automatizadas aprobadas:

- ProfileApiTest: 6 pruebas aprobadas.
- OrganizationAuthorizationTest: 3 pruebas aprobadas.

Total: 9 pruebas automatizadas aprobadas.

### Ejecutar las pruebas

Desde la raíz del proyecto:

```bash
docker compose exec backend php artisan test --filter=ProfileApiTest
docker compose exec backend php artisan test --filter=OrganizationAuthorizationTest
```

Las pruebas usan SQLite en memoria según backend/phpunit.xml.

## Colección de Postman

Ubicación:

postman/collections/ProyectaTec - API de Perfiles - Edsai

La colección permite reproducir consultas públicas, edición de perfiles y pruebas de permisos.

Cada colaborador debe utilizar sus propias credenciales y configurar las variables de autenticación localmente.

No se deben compartir Bearer Tokens reales ni contraseñas en GitHub.

## Evidencias

- Consulta de perfil propio: 200 OK.
- Actualización de perfil propio: 200 OK.
- Consulta pública de perfil: 200 OK.
- Perfil inexistente: 404 Not Found.
- Validación incorrecta: 422.
- Consulta pública de organización: 200 OK.
- Creación de organización: 201 Created.
- Edición autorizada: 200 OK.
- Edición sin permisos: 403 Forbidden.
- Nueve pruebas automatizadas aprobadas.

## Integración con React

El frontend puede consumir las respuestas JSON de estos endpoints.

Las consultas privadas requieren autenticación mediante Sanctum.

Las rutas públicas pueden consultarse sin iniciar sesión.

La colección de Postman permite a los colaboradores verificar el contrato de los endpoints.
