# API de proyectos y necesidades - ProyectaTec

## Información general

La tarea #61, actividad 3.12.1 del Sprint 5, proporciona endpoints Laravel para registrar y consultar proyectos, necesidades comunitarias independientes y necesidades asociadas a proyectos. Este documento describe los nueve endpoints de esa tarea para frontend, backend y revisión.

La URL base de desarrollo es `http://127.0.0.1:8001/api`. Los ejemplos usan identificadores y fechas ilustrativos: deben sustituirse por valores existentes en el entorno correspondiente.

### Autenticación

Los tres endpoints `POST` requieren un usuario autenticado con Laravel Sanctum. Incluye el token obtenido mediante el inicio de sesión en el encabezado:

```http
Authorization: Bearer <token>
Accept: application/json
Content-Type: application/json
```

No incluyas tokens reales en archivos compartidos. Las consultas `GET` son públicas. `Accept: application/json` permite recibir errores en formato JSON.

## Endpoints implementados

Las rutas de la tabla incluyen el prefijo `/api`; los identificadores de detalle deben ser numéricos.

| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| POST | `/api/projects` | Bearer | Registrar proyecto personal o de una organización autorizada. |
| GET | `/api/projects` | Pública | Listar proyectos públicos. |
| GET | `/api/projects/{project}` | Pública | Consultar proyecto público. |
| POST | `/api/community-needs` | Bearer | Registrar necesidad comunitaria independiente. |
| GET | `/api/community-needs` | Pública | Listar necesidades comunitarias abiertas. |
| GET | `/api/community-needs/{communityNeed}` | Pública | Consultar necesidad comunitaria abierta. |
| POST | `/api/projects/{project}/needs` | Bearer y creador del proyecto | Registrar necesidad de un proyecto público. |
| GET | `/api/projects/{project}/needs` | Pública | Listar necesidades abiertas de un proyecto público. |
| GET | `/api/projects/{project}/needs/{need}` | Pública | Consultar necesidad abierta del proyecto indicado. |

## Paginación y códigos HTTP

Los tres listados usan `?page=N`, con **15 elementos por página**, ordenados por `created_at` descendente y luego por `id` descendente. Devuelven la colección correspondiente y `meta` con `current_page`, `per_page`, `last_page` y `total`. No se implementan filtros avanzados.

| Código | Significado |
|---|---|
| 200 | Consulta o listado exitoso. |
| 201 | Registro creado. |
| 401 | Escritura sin autenticación válida. |
| 403 | Usuario autenticado sin permiso para la operación. |
| 404 | Identificador inexistente, recurso no público o necesidad consultada bajo otro proyecto. |
| 422 | Datos que no cumplen las validaciones. |

Los mensajes concretos de Laravel pueden variar según la configuración; el cliente debe basarse en el código HTTP y, para validación, en las claves de `errors`.

## Proyectos

### POST /api/projects

Requiere Sanctum. Cualquier usuario autenticado puede crear un proyecto personal. Si se proporciona `organization_id`, debe existir una membresía del usuario con `role = admin` y `status = active`; de lo contrario, responde `403`. El servidor asigna `created_by` a partir del usuario autenticado.

| Campo | Reglas |
|---|---|
| `title` | Obligatorio, cadena no vacía, máximo 255 caracteres. |
| `description` | Obligatorio, cadena no vacía. |
| `category_id` | Obligatorio, entero y categoría existente. |
| `status` | Obligatorio: `open`, `in_progress` o `completed`. |
| `organization_id` | Opcional y nullable; entero y organización existente. |
| `modality`, `location` | Opcionales y nullable; cadenas de máximo 255 caracteres. No hay catálogo de modalidades. |
| `starts_at`, `ends_at` | Opcionales y nullable; fechas válidas. Si ambas se proporcionan, `ends_at` no puede ser anterior a `starts_at`. Se recomienda ISO 8601 con zona horaria. |
| `created_by` | Prohibido en el cuerpo, incluso con valor `null`. |

Solicitud de ejemplo:

```json
{
  "title": "Monitoreo del agua",
  "description": "Herramienta para una comunidad.",
  "category_id": 7,
  "status": "open",
  "modality": "híbrida",
  "location": "Oaxaca",
  "starts_at": "2027-01-15T09:00:00Z",
  "ends_at": "2027-06-15T18:00:00Z"
}
```

Respuesta `201`:

```json
{
  "project": {
    "id": 12,
    "title": "Monitoreo del agua",
    "description": "Herramienta para una comunidad.",
    "status": "open",
    "category_id": 7,
    "organization_id": null,
    "modality": "híbrida",
    "location": "Oaxaca",
    "starts_at": "2027-01-15T09:00:00.000000Z",
    "ends_at": "2027-06-15T18:00:00.000000Z",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-05T12:00:00.000000Z"
  }
}
```

### GET /api/projects

Devuelve proyectos con estado `open`, `in_progress` o `completed`. Excluye `draft` y cualquier otro estado. Por ejemplo, `GET /api/projects?page=1` responde `200`:

```json
{
  "projects": [
    {
      "id": 12,
      "title": "Monitoreo del agua",
      "description": "Herramienta para una comunidad.",
      "status": "open",
      "category_id": 7,
      "organization_id": null,
      "modality": "híbrida",
      "location": "Oaxaca",
      "starts_at": "2027-01-15T09:00:00.000000Z",
      "ends_at": "2027-06-15T18:00:00.000000Z",
      "created_at": "2026-11-05T12:00:00.000000Z",
      "updated_at": "2026-11-05T12:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 1 }
}
```

### GET /api/projects/{project}

Devuelve `200` con el objeto `project` mostrado en la respuesta de creación. Por ejemplo, `GET /api/projects/12` responde:

```json
{
  "project": {
    "id": 12,
    "title": "Monitoreo del agua",
    "description": "Herramienta para una comunidad.",
    "status": "open",
    "category_id": 7,
    "organization_id": null,
    "modality": "híbrida",
    "location": "Oaxaca",
    "starts_at": "2027-01-15T09:00:00.000000Z",
    "ends_at": "2027-06-15T18:00:00.000000Z",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-05T12:00:00.000000Z"
  }
}
```

Un proyecto inexistente o con estado no público devuelve `404`.

## Necesidades comunitarias independientes

Una `CommunityNeed` pertenece a su creador y a una categoría; no pertenece a un proyecto ni se registra en nombre de una organización. Es distinta de una `ProjectNeed`, que pertenece a un proyecto y se consulta mediante rutas anidadas.

### POST /api/community-needs

Requiere Sanctum. Cualquier usuario autenticado puede crearla; el servidor asigna `created_by`.

| Campo | Reglas |
|---|---|
| `title` | Obligatorio, cadena no vacía, máximo 255 caracteres. |
| `description` | Obligatorio, cadena no vacía. |
| `category_id` | Obligatorio, entero y categoría existente. |
| `status` | Obligatorio; solo `open`. |
| `location` | Opcional y nullable; cadena de máximo 255 caracteres. |
| `created_by`, `project_id`, `organization_id` | Prohibidos en el cuerpo, incluso con valor `null`. |

Solicitud de ejemplo:

```json
{
  "title": "Capacitación en gestión de agua",
  "description": "La comunidad requiere acompañamiento técnico.",
  "category_id": 7,
  "location": "Oaxaca",
  "status": "open"
}
```

Respuesta `201`:

```json
{
  "community_need": {
    "id": 20,
    "title": "Capacitación en gestión de agua",
    "description": "La comunidad requiere acompañamiento técnico.",
    "status": "open",
    "category_id": 7,
    "location": "Oaxaca",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-05T12:00:00.000000Z"
  }
}
```

### GET /api/community-needs

Lista exclusivamente necesidades comunitarias `open`. Ejemplo de `GET /api/community-needs?page=1`, respuesta `200`:

```json
{
  "community_needs": [
    {
      "id": 20,
      "title": "Capacitación en gestión de agua",
      "description": "La comunidad requiere acompañamiento técnico.",
      "status": "open",
      "category_id": 7,
      "location": "Oaxaca",
      "created_at": "2026-11-05T12:00:00.000000Z",
      "updated_at": "2026-11-05T12:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 1 }
}
```

### GET /api/community-needs/{communityNeed}

Por ejemplo, `GET /api/community-needs/20` responde `200`:

```json
{
  "community_need": {
    "id": 20,
    "title": "Capacitación en gestión de agua",
    "description": "La comunidad requiere acompañamiento técnico.",
    "status": "open",
    "category_id": 7,
    "location": "Oaxaca",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-05T12:00:00.000000Z"
  }
}
```

Una necesidad inexistente o que no esté `open` devuelve `404`.

## Necesidades asociadas a proyectos

Una `ProjectNeed` pertenece al proyecto indicado en la URL. No tiene categoría, ubicación ni creador propios en su contrato. Sus rutas no consultan ni crean necesidades comunitarias.

### POST /api/projects/{project}/needs

Requiere Sanctum y solo permite al **creador del proyecto** registrar una necesidad. Un administrador activo de la organización que no sea el creador no obtiene este permiso. El proyecto debe existir y tener estado `open`, `in_progress` o `completed`; de lo contrario responde `404`. Si es público pero el usuario no es su creador, responde `403`.

| Campo | Reglas |
|---|---|
| `title` | Obligatorio, cadena no vacía, máximo 255 caracteres. |
| `description` | Obligatorio, cadena no vacía. |
| `status` | Obligatorio; solo `open`. |
| `required_profile` | Opcional y nullable; cadena de máximo 255 caracteres. |
| `openings` | Opcional y nullable; entero entre 1 y 2147483647. |
| `project_id`, `created_by`, `category_id`, `organization_id` | Prohibidos en el cuerpo, incluso con valor `null`. |

El servidor obtiene `project_id` del proyecto de la ruta. Por ejemplo, para `POST /api/projects/12/needs`:

```json
{
  "title": "Desarrollo de interfaz",
  "description": "Implementar pantallas de consulta.",
  "required_profile": "Desarrollo frontend",
  "openings": 2,
  "status": "open"
}
```

Respuesta `201`:

```json
{
  "project_need": {
    "id": 30,
    "project_id": 12,
    "title": "Desarrollo de interfaz",
    "description": "Implementar pantallas de consulta.",
    "required_profile": "Desarrollo frontend",
    "openings": 2,
    "status": "open",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-05T12:00:00.000000Z"
  }
}
```

### GET /api/projects/{project}/needs

El proyecto debe ser público (`open`, `in_progress` o `completed`). Solo se listan sus necesidades `open`. Un proyecto inexistente o no público devuelve `404`; si es público y no tiene necesidades abiertas, devuelve `200` con `project_needs: []`.

Ejemplo de `GET /api/projects/12/needs?page=1`, respuesta `200`:

```json
{
  "project_needs": [
    {
      "id": 30,
      "project_id": 12,
      "title": "Desarrollo de interfaz",
      "description": "Implementar pantallas de consulta.",
      "required_profile": "Desarrollo frontend",
      "openings": 2,
      "status": "open",
      "created_at": "2026-11-05T12:00:00.000000Z",
      "updated_at": "2026-11-05T12:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 1 }
}
```

### GET /api/projects/{project}/needs/{need}

Por ejemplo, `GET /api/projects/12/needs/30` responde `200`:

```json
{
  "project_need": {
    "id": 30,
    "project_id": 12,
    "title": "Desarrollo de interfaz",
    "description": "Implementar pantallas de consulta.",
    "required_profile": "Desarrollo frontend",
    "openings": 2,
    "status": "open",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-05T12:00:00.000000Z"
  }
}
```

Responde `404` si el proyecto no existe o no es público, o si la necesidad no existe, no está `open` o pertenece a otro proyecto.

## Ejemplos de errores

Para una solicitud JSON con datos inválidos, Laravel responde `422` con `message` y errores por campo. Por ejemplo, al omitir `title`:

```json
{
  "message": "The title field is required.",
  "errors": {
    "title": ["The title field is required."]
  }
}
```

Una operación autenticada sin permiso, como crear una necesidad en un proyecto público de otro usuario, responde `403`. Un cuerpo JSON típico de Laravel es:

```json
{
  "message": "This action is unauthorized."
}
```

El texto concreto no es un contrato estable. En particular, una categoría u organización inexistente en el cuerpo de creación produce un error de validación `422`, no un detalle `404`.

## Categorías e integración con React

`category_id` identifica una categoría existente y es obligatorio al crear proyectos y necesidades comunitarias. Actualmente **no hay un endpoint público para listar categorías**. Los nombres incluidos en el seeder no garantizan IDs iguales entre entornos: el equipo debe obtener los IDs reales mediante una fuente autorizada, por ejemplo una consulta de solo lectura a `categories` o el catálogo proporcionado por backend. Los IDs de este documento son ilustrativos.

El cliente Axios de `frontend/src/api/axios.ts` ya usa por defecto `http://localhost:8001/api` como `baseURL` y agrega el Bearer token almacenado cuando existe. Desde ese cliente, usa rutas como `api.get('/projects')`, no `api.get('/api/projects')`. Los recursos responden con nombres de campos en inglés y no incluyen objetos completos de usuario, categoría, organización ni postulaciones; muestran los IDs aplicables. Las fechas de respuesta usan el formato ISO de los recursos Laravel y los campos opcionales pueden ser `null`.

## Limitaciones actuales

- No hay filtros avanzados del Sprint 6 en estos listados.
- Estas rutas no implementan edición, cierre ni eliminación de necesidades; no constituyen un CRUD completo de necesidades.
- No existe un flujo privado de borradores en estas APIs: los POST no aceptan `draft` y los GET públicos lo excluyen.
- La integración de estas APIs con el catálogo y formularios de React no forma parte de la tarea documentada.
- `/api/proyectos/destacado` es una ruta anterior, con un contrato diferente en español; no forma parte de estos nueve endpoints. Actualmente selecciona el último proyecto sin filtrar su estado, por lo que podría exponer un borrador existente.
