# API de avances de proyectos — actividad 3.14.2

El registro de avances permite publicar y consultar el historial periódico de un
proyecto. Cada `ProjectUpdate` pertenece a un único proyecto y conserva el usuario
que lo creó. Este registro podrá servir de referencia a las futuras funciones de
archivos y comentarios del Issue #106; sus endpoints no forman parte de esta API.

Las rutas usan el prefijo `/api` y los identificadores `project` y `update` son
numéricos. El avance de una ruta anidada debe pertenecer al proyecto indicado.

## Rutas y acceso

| Método | Ruta | Autenticación | Éxito |
| --- | --- | --- | --- |
| GET | `/api/projects/{project}/updates` | Pública para proyectos visibles | 200 |
| GET | `/api/projects/{project}/updates/{update}` | Pública para proyectos visibles | 200 |
| POST | `/api/projects/{project}/updates` | Sanctum y usuario activo | 201 |
| PATCH | `/api/projects/{project}/updates/{update}` | Sanctum y usuario activo | 200 |

Para las escrituras, envía `Authorization: Bearer <token>` y `Accept:
application/json`. También se recomienda enviar `Content-Type: application/json`.
Los GET no requieren token.

### Visibilidad y permisos

Un proyecto es público si no está oculto, su estado es `open`, `in_progress` o
`completed`, y no tiene organización asociada o esta tiene `approval_status =
approved`. Estas rutas devuelven 404 para proyectos ocultos, en `draft`, `closed`
o `withdrawn`, o pertenecientes a organizaciones pendientes o rechazadas.

POST y PATCH permiten actuar al usuario activo que cumpla al menos una condición:

- Es el creador del proyecto.
- Es miembro de la organización asociada y aprobada con `role = admin` y
  `status = active`.
- Tiene una membresía `project_members` del proyecto con `status = active`.
  No se exige un rol determinado ni `application_id`; una solicitud pendiente o
  rechazada no concede acceso por sí sola.

Cualquiera de estos actores puede editar un avance aunque no sea su autor. El
autor original no cambia. Los proyectos visibles `completed` permiten GET, pero
rechazan las escrituras autorizadas con 422. Solo `open` e `in_progress` admiten
escrituras. La autorización y las validaciones del cuerpo se procesan antes de la
comprobación de `completed`, por lo que, si coinciden errores, puede responderse
primero con 403 u otro 422.

## Cuerpo de POST y PATCH

| Campo | POST | PATCH |
| --- | --- | --- |
| `title` | Obligatorio, cadena no vacía, máximo 255 caracteres | Opcional; si se envía, mismas reglas |
| `description` | Obligatoria, cadena no vacía | Opcional; si se envía, mismas reglas |
| `progress` | Opcional, entero entre 0 y 100 o `null` | Opcional, entero entre 0 y 100 o `null` |

En POST, omitir `progress` registra `null`, que significa que no se proporcionó
porcentaje; no equivale a cero. En PATCH los campos omitidos se conservan y
`"progress": null` elimina el porcentaje. Un PATCH sin al menos uno de estos tres
campos editables devuelve 422.

Los campos `id`, `project_id` y `created_by` deben estar ausentes incluso si su
valor es `null`. El servidor obtiene el proyecto de la ruta y el autor de la
sesión autenticada; PATCH conserva el autor original.

## Respuestas

El autor expuesto contiene solamente `id` y `name`; no incluye correo ni otros
datos privados. Las fechas de los ejemplos son ISO 8601.

### Listado: GET 200

El historial se pagina en grupos de 15. Se puede solicitar otra página con
`?page=2`. El orden es `created_at DESC` y, ante empate, `id DESC`.
`latest_progress` se calcula sobre **todos** los avances del proyecto, no solo
sobre la página actual: representa el registro más reciente, según el mismo
orden, cuyo `progress` no sea `null`. Un registro posterior sin porcentaje no lo
reemplaza. Si no existe ningún porcentaje, `latest_progress` es `null`.

```json
{
  "project_updates": [
    {
      "id": 42,
      "project_id": 12,
      "title": "Primera etapa",
      "description": "Se completó el diagnóstico.",
      "progress": 25,
      "author": { "id": 7, "name": "Ana" },
      "created_at": "2026-11-16T10:00:00.000000Z",
      "updated_at": "2026-11-16T10:00:00.000000Z"
    }
  ],
  "latest_progress": {
    "update_id": 42,
    "progress": 25,
    "created_at": "2026-11-16T10:00:00.000000Z"
  },
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 1 }
}
```

### Detalle: GET 200

```json
{
  "project_update": {
    "id": 42,
    "project_id": 12,
    "title": "Primera etapa",
    "description": "Se completó el diagnóstico.",
    "progress": 25,
    "author": { "id": 7, "name": "Ana" },
    "created_at": "2026-11-16T10:00:00.000000Z",
    "updated_at": "2026-11-16T10:00:00.000000Z"
  }
}
```

### Creación: POST 201

Ejemplo de cuerpo:

```json
{ "title": "Primera etapa", "description": "Se completó el diagnóstico.", "progress": 25 }
```

Respuesta:

```json
{
  "project_update": {
    "id": 42,
    "project_id": 12,
    "title": "Primera etapa",
    "description": "Se completó el diagnóstico.",
    "progress": 25,
    "author": { "id": 7, "name": "Ana" },
    "created_at": "2026-11-16T10:00:00.000000Z",
    "updated_at": "2026-11-16T10:00:00.000000Z"
  }
}
```

### Edición: PATCH 200

Ejemplo de cuerpo parcial:

```json
{ "progress": null }
```

Respuesta: el porcentaje se elimina, los demás campos se conservan y `author`
sigue siendo el autor original.

```json
{
  "project_update": {
    "id": 42,
    "project_id": 12,
    "title": "Primera etapa",
    "description": "Se completó el diagnóstico.",
    "progress": null,
    "author": { "id": 7, "name": "Ana" },
    "created_at": "2026-11-16T10:00:00.000000Z",
    "updated_at": "2026-11-16T11:00:00.000000Z"
  }
}
```

### Errores

Los textos concretos pueden variar según la configuración de Laravel; los códigos
y las claves de validación son las relevantes para el cliente.

**401**, escritura sin autenticación:

```json
{ "message": "Unauthenticated." }
```

**403**, cuenta desactivada o usuario sin permisos:

```json
{ "message": "This action is unauthorized." }
```

Una cuenta desactivada puede recibir el mensaje `Esta cuenta está desactivada.`.

**404**, proyecto inexistente o no público, avance inexistente o perteneciente a
otro proyecto:

```json
{ "message": "Not Found" }
```

**422**, por ejemplo un porcentaje fuera del rango:

```json
{
  "message": "The progress field must not be greater than 100.",
  "errors": { "progress": ["The progress field must not be greater than 100."] }
}
```

Para una escritura autorizada con cuerpo válido sobre un proyecto `completed`:

```json
{
  "message": "Este proyecto no permite registrar ni modificar avances.",
  "errors": { "project": ["Este proyecto no permite registrar ni modificar avances."] }
}
```

## Ejemplos Axios para frontend

Desde un módulo ubicado en `frontend/src/api/`, reutiliza `./axios`. Su `baseURL`
ya incluye `/api` y su interceptor agrega el token de `localStorage` si existe;
no agregues otro `/api` ni incluyas credenciales en el código. Los identificadores
deben venir del proyecto y avance seleccionados por el usuario.

```ts
import api from './axios';

// Las escrituras modifican datos reales: usar solo con autorización.
export async function listarAvances(projectId: number, page = 1) {
  const { data } = await api.get(`/projects/${projectId}/updates`, { params: { page } });
  return data; // project_updates, latest_progress, meta
}

export async function consultarAvance(projectId: number, updateId: number) {
  const { data } = await api.get(`/projects/${projectId}/updates/${updateId}`);
  return data.project_update;
}

export async function registrarAvance(projectId: number) {
  const { data } = await api.post(`/projects/${projectId}/updates`, {
    title: 'Primera etapa', description: 'Se completó el diagnóstico.', progress: 25,
  });
  return data.project_update;
}

export async function actualizarAvance(projectId: number, updateId: number) {
  const { data } = await api.patch(`/projects/${projectId}/updates/${updateId}`, {
    progress: null,
  });
  return data.project_update;
}
```

Maneja los errores de Axios según `error.response?.status` y, para 422, consulta
`error.response?.data.errors`; los fallos de red pueden no incluir `response`.

## Evidencia de pruebas

Según los resultados reportados para esta actividad, se aprobaron **60 pruebas y
603 verificaciones**: 22 pruebas y 269 verificaciones de avances, más seis suites
de regresión con 38 pruebas y 334 verificaciones. Se ejecutaron con **SQLite en
memoria**, no con PostgreSQL. La validación directa sobre PostgreSQL está
pendiente, incluida la restricción de rango propia de ese motor.
