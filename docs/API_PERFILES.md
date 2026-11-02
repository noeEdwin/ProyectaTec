# API de Perfiles y Organizaciones - ProyectaTec

## Información general

- Actividad: 3.11.2 - Crear API para consultar y editar perfiles en Laravel
- Issue: #49
- Responsable: EdsaiGarrey
- Rama: feature/api-perfiles-laravel
- Tecnologías: Laravel, Sanctum, PostgreSQL, Postman y Bruno

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

La creación/actualización de perfiles requiere `display_name` y permite `description`, `phone`, `location`, `institution` y `field_of_study`. Las respuestas personales también usan `display_name` para mantener un único contrato con React. El controlador usa una lista cerrada de campos permitidos, por lo que ignora `user_id`, contraseñas y roles enviados en el formulario.

La consulta pública de perfiles y organizaciones no expone teléfonos, correos electrónicos ni credenciales.

La edición de organizaciones está protegida mediante Laravel Sanctum y una política que verifica el rol `admin` y el estado `active` en `organization_members`. Un administrador puede actualizar nombre, tipo, descripción, sector, correo, teléfono y ubicación.

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

### Ejemplos para React

Perfil autenticado (`GET /api/me/profile`):

```json
{
  "profile": {
    "id": 12,
    "is_organization": false,
    "display_name": "Ana López",
    "description": "Estudiante de ingeniería",
    "phone": "9511234567",
    "location": "Oaxaca",
    "institution": "ITO",
    "field_of_study": "Sistemas",
    "image": null,
    "contact": {
      "phone": "9511234567",
      "email": "ana@example.com"
    },
    "classification": "ITO Sistemas",
    "created_at": "2026-10-28T18:00:00.000000Z"
  }
}
```

Perfil público (`GET /api/profiles/12`), sin información de contacto:

```json
{
  "profile": {
    "id": 12,
    "is_organization": false,
    "display_name": "Ana López",
    "description": "Estudiante de ingeniería",
    "location": "Oaxaca",
    "image": null,
    "classification": "ITO Sistemas"
  }
}
```

Errores relevantes:

React debe decidir el flujo por el código HTTP. En particular, las consultas públicas con un identificador inexistente responden `404`; el texto del cuerpo lo genera el model binding de Laravel y no forma parte del contrato estable.

```json
{
  "message": "Unauthenticated."
}
```

```json
{
  "message": "This action is unauthorized."
}
```

```json
{
  "message": "The display name field is required.",
  "errors": {
    "display_name": [
      "The display name field is required."
    ]
  }
}
```

## Pruebas realizadas

Pruebas automatizadas aprobadas:

- ProfileApiTest: 10 pruebas aprobadas.
- OrganizationAuthorizationTest: 3 pruebas aprobadas.
- OrganizationProfileApiTest: 10 pruebas aprobadas.

Total: 23 pruebas automatizadas entre los flujos de perfiles y organizaciones.

### Ejecutar las pruebas

Desde la raíz del proyecto:

```bash
docker compose run --rm backend php artisan test --filter=ProfileApiTest
docker compose run --rm backend php artisan test --filter=OrganizationAuthorizationTest
docker compose run --rm backend php artisan test --filter=OrganizationProfileApiTest
```

Las pruebas usan SQLite en memoria según backend/phpunit.xml.

## Colecciones de API

- **Postman:** `postman/collections/ProyectaTec Perfiles y Organizaciones.postman_collection.json`
- **Entorno Postman:** `postman/environments/ProyectaTec Local.postman_environment.json`
- **Bruno:** carpeta `bruno/06 - Perfiles/` dentro de la colección raíz `bruno/`

Ambas colecciones contienen los endpoints `GET /api/me/profile`, `POST /api/profile`, `PATCH /api/me/profile`, `GET /api/profiles/{profile}`, `GET /api/organizations/{organization}`, `POST /api/organizations` y `PATCH /api/organizations/{organization}`. Incluyen casos 401, 403, 404 y 422 además de las peticiones correctas.

Ejecuta primero el login auxiliar. Las peticiones de creación guardan los IDs de perfil y organización para reutilizarlos. Para comprobar el `403`, configura el token de un usuario que no sea administrador y el ID de una organización que no administre.

Usa credenciales locales y no guardes tokens reales en GitHub.

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
- Veintitrés pruebas automatizadas de perfiles y organizaciones aprobadas.

## Integración con React

El frontend puede consumir las respuestas JSON de estos endpoints.

Las consultas privadas requieren autenticación mediante Sanctum.

Las rutas públicas pueden consultarse sin iniciar sesión.

Las colecciones Postman y Bruno permiten a los colaboradores verificar el contrato de los endpoints.
