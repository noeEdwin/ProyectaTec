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
| PATCH | `/api/projects/{project}` | Bearer y autor/administrador activo | Editar proyecto y cambiar estado sin borrarlo. |
| POST | `/api/community-needs` | Bearer | Registrar necesidad comunitaria independiente. |
| GET | `/api/community-needs` | Pública | Listar necesidades comunitarias abiertas. |
| GET | `/api/community-needs/{communityNeed}` | Pública | Consultar necesidad comunitaria abierta. |
| PATCH | `/api/community-needs/{communityNeed}` | Bearer y autor | Editar necesidad comunitaria y cerrar o retirar. |
| POST | `/api/projects/{project}/needs` | Bearer y creador del proyecto | Registrar necesidad de un proyecto público. |
| GET | `/api/projects/{project}/needs` | Pública | Listar necesidades abiertas de un proyecto público. |
| GET | `/api/projects/{project}/needs/{need}` | Pública | Consultar necesidad abierta del proyecto indicado. |

## Paginación y códigos HTTP

Los tres listados usan `?page=N`, con **15 elementos por página**, ordenados por `created_at` descendente y luego por `id` descendente. Devuelven la colección correspondiente y `meta` con `current_page`, `per_page`, `last_page` y `total`. Los filtros descritos a continuación se aplican a proyectos y necesidades comunitarias, no al listado anidado de necesidades de proyecto.

| Código | Significado |
|---|---|
| 200 | Consulta o listado exitoso. |
| 201 | Registro creado. |
| 401 | Escritura sin autenticación válida. |
| 403 | Usuario autenticado sin permiso para la operación. |
| 404 | Identificador inexistente, recurso no público o necesidad consultada bajo otro proyecto. |
| 422 | Datos que no cumplen las validaciones. |

Los mensajes concretos de Laravel pueden variar según la configuración; el cliente debe basarse en el código HTTP y, para validación, en las claves de `errors`.

### Reglas comunes de búsqueda

En los listados de proyectos y necesidades comunitarias, `q` busca una **subcadena literal** en `title` **o** `description`. Los caracteres `%`, `_` y `!` son literales, no comodines. Se eliminan espacios externos; si `q` está ausente, vacío o solo contiene espacios, no se aplica búsqueda textual. La búsqueda ignora diferencias de mayúsculas y minúsculas ASCII; no se garantiza una equivalencia Unicode completa entre SQLite y PostgreSQL ni una búsqueda insensible a acentos.

Los filtros suministrados se combinan con **AND**; dentro de `q`, título y descripción se combinan con un **OR agrupado**. Las reglas de visibilidad siempre se mantienen. Los parámetros desconocidos se ignoran. Una categoría positiva inexistente o cualquier combinación sin coincidencias devuelve `200` con un arreglo vacío y metadatos; un `category_id` vacío, no entero, no positivo o mayor que `9223372036854775807`, así como un `q` de tipo inválido o mayor de 255 caracteres, devuelve `422`. Envía `Accept: application/json` para recibir errores JSON.

Los IDs y sectores de los ejemplos son ilustrativos y deben sustituirse por valores reales del entorno. Codifica los parámetros en la URL; por ejemplo, `Educación` se envía como `Educaci%C3%B3n`.

## Proyectos

### POST /api/projects

Requiere Sanctum. Una cuenta personal autenticada puede crear un proyecto personal. Una cuenta representante de organización necesita al menos una organización aprobada bajo su administración activa, incluso para crear un proyecto sin `organization_id`. Si se proporciona `organization_id`, debe existir una membresía con `role = admin`, `status = active` **y organización aprobada**; de lo contrario, responde `403`. El servidor asigna `created_by` a partir del usuario autenticado.

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

Devuelve proyectos no ocultos (`is_hidden = false`) con estado `open`, `in_progress` o `completed`; si pertenecen a una organización, solo cuando esta está aprobada. Excluye proyectos ocultos, `draft`, otros estados y proyectos vinculados a organizaciones pendientes o rechazadas.

| Parámetro opcional | Comportamiento |
|---|---|
| `q` | Cadena de hasta 255 caracteres; búsqueda literal en título o descripción según las reglas comunes. |
| `category_id` | Entero positivo; igualdad exacta con la categoría del proyecto. |
| `sector` | Cadena de hasta 255 caracteres; igualdad exacta con `organizations.sector`, con mayúsculas y acentos significativos. Se recortan espacios externos; vacío o solo espacios no filtra. Una cadena inválida o demasiado larga devuelve `422`. |
| `page` | Página del listado; 15 elementos por página. |

Sin `sector` se incluyen proyectos individuales visibles. Al solicitar un sector no vacío, solo se incluyen proyectos de organizaciones aprobadas con ese sector exacto; quedan fuera los individuales y las organizaciones con sector nulo o distinto. `sector` es texto libre de la organización, no `organization_type`, y el listado no devuelve el sector dentro de `organization`.

```http
GET /api/projects?q=agua
GET /api/projects?category_id=2
GET /api/projects?sector=Educaci%C3%B3n
GET /api/projects?q=agua&category_id=2&sector=Educaci%C3%B3n&page=1
```

Ejemplo de respuesta `200` paginada para el último GET, si los datos coinciden:

```json
{
  "projects": [
    {
      "id": 12,
      "title": "Monitoreo del agua",
      "description": "Herramienta para una comunidad.",
      "status": "open",
      "category_id": 2,
      "category": { "id": 2, "name": "Medio ambiente" },
      "organization_id": 3,
      "organization": { "id": 3, "name": "Organización comunitaria" },
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

Ejemplo `200` sin coincidencias para `GET /api/projects?category_id=999999`:

```json
{
  "projects": [],
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 0 }
}
```

Ejemplo `422` para `GET /api/projects?category_id=0` con `Accept: application/json`:

```json
{
  "message": "The category id field must be at least 1.",
  "errors": { "category_id": ["The category id field must be at least 1."] }
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

### PATCH /api/projects/{project} (3.12.2)

Es la **misma ruta de edición anterior**, ampliada; requiere Sanctum y autor del
proyecto o administrador activo de la organización aprobada a la que pertenece.
Admite cambios parciales de `title`, `description`, `modality`, `location`,
`starts_at`, `ends_at` y `status`. Si cambias una fecha, el rango completo
(incluidas fechas anteriores del proyecto) debe seguir siendo válido.
`id`, `created_by`, `organization_id` y `category_id` están prohibidos incluso
si se envían como `null`; tampoco se acepta una petición sin campos editables.

| Estado actual | Destinos permitidos |
|---|---|
| `draft` (registro anterior) | `draft`, `open`, `withdrawn` |
| `open` | `open`, `in_progress`, `completed`, `closed`, `withdrawn` |
| `in_progress` | `in_progress`, `completed`, `closed`, `withdrawn` |
| `completed` | `completed`, `closed`, `withdrawn` |
| `closed` / `withdrawn` | Solo el mismo estado; no se permite reabrir. |

Ejemplo: `PATCH /api/projects/12` con `{ "description": "Nueva descripción", "status": "closed" }`
responde `200`:

```json
{
  "project": {
    "id": 12,
    "title": "Monitoreo del agua",
    "description": "Nueva descripción",
    "status": "closed",
    "category_id": 7,
    "organization_id": null,
    "modality": "híbrida",
    "location": "Oaxaca",
    "starts_at": "2027-01-15T09:00:00.000000Z",
    "ends_at": "2027-06-15T18:00:00.000000Z",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-08T12:00:00.000000Z"
  }
}
```
El recurso permanece en la base de datos con sus solicitudes e historial, pero
desaparece de las rutas públicas `GET /api/projects` y `GET /api/projects/12`.
Sin sesión se recibe `401`, sin permiso `403`, identificador inexistente `404`
y datos o transición inválidos `422` con errores por campo.

## Necesidades comunitarias independientes

Una `CommunityNeed` pertenece a su creador y a una categoría; no pertenece a un proyecto ni se registra en nombre de una organización. Es distinta de una `ProjectNeed`, que pertenece a un proyecto y se consulta mediante rutas anidadas.

### PATCH /api/community-needs/{communityNeed} (3.12.2)

Solo el autor autenticado puede modificar `title`, `description`, `location` y
`status`. No se aceptan `id`, `created_by`, `category_id`, `project_id` ni
`organization_id`. `draft` puede pasar a `open` o `withdrawn`; `open` puede
pasar a `closed` o `withdrawn`; estos dos últimos estados no se reabren.

Ejemplo: `PATCH /api/community-needs/20` con `{ "status": "withdrawn" }`
responde `200`:

```json
{
  "community_need": {
    "id": 20,
    "title": "Capacitación en gestión de agua",
    "description": "La comunidad requiere acompañamiento técnico.",
    "status": "withdrawn",
    "category_id": 7,
    "location": "Oaxaca",
    "created_at": "2026-11-05T12:00:00.000000Z",
    "updated_at": "2026-11-08T12:00:00.000000Z"
  }
}
```
La publicación se conserva en la base de datos aunque deje de estar visible en
consultas públicas. Sin sesión: `401`; autor distinto: `403`; recurso
inexistente: `404`; datos inválidos: `422`.

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

Lista exclusivamente necesidades comunitarias con `status = open` e `is_hidden = false`.

| Parámetro opcional | Comportamiento |
|---|---|
| `q` | Cadena de hasta 255 caracteres; búsqueda literal en título o descripción según las reglas comunes. |
| `category_id` | Entero positivo; igualdad exacta con la categoría. |
| `page` | Página del listado; 15 elementos por página. |

No hay filtro de sector ni de apoyo para necesidades comunitarias. Un parámetro `sector` desconocido se ignora; no filtra ni devuelve error.

```http
GET /api/community-needs?q=agua
GET /api/community-needs?category_id=2
GET /api/community-needs?q=agua&category_id=2&page=1
```

Ejemplo de `GET /api/community-needs?q=agua&category_id=2&page=1`, respuesta `200`:

```json
{
  "community_needs": [
    {
      "id": 20,
      "title": "Capacitación en gestión de agua",
      "description": "La comunidad requiere acompañamiento técnico.",
      "status": "open",
      "category_id": 2,
      "category": { "id": 2, "name": "Medio ambiente" },
      "location": "Oaxaca",
      "created_at": "2026-11-05T12:00:00.000000Z",
      "updated_at": "2026-11-05T12:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 1 }
}
```

Sin coincidencias se responde `200` con `"community_needs": []` y `meta` con los mismos campos que en el ejemplo de proyectos sin resultados. Una validación fallida responde `422` con `message` y `errors`, como en el ejemplo anterior.

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

Requiere Sanctum y solo permite al **creador del proyecto** registrar una necesidad. Un administrador activo de la organización que no sea el creador no obtiene este permiso. El proyecto debe existir y tener estado `open`, `in_progress` o `completed`; si está vinculado a una organización, esta debe estar aprobada. De lo contrario responde `404`. Si es público pero el usuario no es su creador, responde `403`.

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

El proyecto debe ser público (`open`, `in_progress` o `completed`) y su organización, si la tiene, debe estar aprobada. Solo se listan sus necesidades `open`. Un proyecto inexistente o no público devuelve `404`; si es público y no tiene necesidades abiertas, devuelve `200` con `project_needs: []`.

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

`category_id` identifica una categoría y es obligatorio al crear proyectos y necesidades comunitarias. `GET /api/categories` es público y devuelve `{ "categories": [{ "id": 2, "name": "Medio ambiente" }] }`, ordenado por nombre. Los IDs varían entre entornos. Al filtrar, un entero positivo inexistente devuelve una lista vacía; al crear, una categoría inexistente produce `422`.

El cliente Axios de `frontend/src/api/axios.ts` ya usa por defecto `http://localhost:8001/api` como `baseURL` y agrega el Bearer token almacenado cuando existe. Desde ese cliente, usa rutas como `api.get('/projects')`, no `api.get('/api/projects')`. Los listados incluyen categoría y, para proyectos, organización limitada a `id` y `name`; no incluyen objetos completos de usuario ni postulaciones. Las fechas usan el formato ISO de los recursos Laravel y los campos opcionales pueden ser `null`.

El catálogo actual de React solicita la primera página de cada listado y filtra localmente los resultados recibidos: puede operar sobre una cantidad limitada de publicaciones. Los nuevos parámetros aún no están integrados allí; consumir los filtros y gestionar la paginación de ambos listados corresponde a una tarea posterior.

## Limitaciones actuales

- El filtro de apoyo no está implementado: requiere definición de Alessandro.
- Estas rutas no implementan edición, cierre ni eliminación de necesidades; no constituyen un CRUD completo de necesidades.
- No existe un flujo privado de borradores en estas APIs: los POST no aceptan `draft` y los GET públicos lo excluyen.
- Las pruebas reportadas para búsqueda y regresión se ejecutaron con SQLite en memoria: **36 pruebas y 444 verificaciones aprobadas**. La validación específica en PostgreSQL permanece pendiente; estos resultados no prueban PostgreSQL directamente.
- `/api/proyectos/destacado` es una ruta anterior, con un contrato diferente en español; no forma parte de estos nueve endpoints. Selecciona el último proyecto público de una organización aprobada o responde con la información base cuando no hay uno.
