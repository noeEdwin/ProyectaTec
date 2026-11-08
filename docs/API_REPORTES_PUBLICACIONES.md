# Reportes de publicaciones — Sprint 5, actividad 3.12.2

## Decisión funcional del alcance

Para el issue #66, Edwin indicó que **«reportes» comprende los dos flujos**:

1. Denunciar un proyecto o una necesidad comunitaria pública por contenido inapropiado.
2. Consultar estadísticas de publicaciones por tipo y estado para administración.

Esta decisión quedó implementada por separado en Laravel. La confirmación de
Alessandro mencionada en el issue #66 **sigue pendiente**; no debe indicarse
como aprobada hasta que la confirme. El equipo React puede integrar los
contratos siguientes sin compartir credenciales reales.

Base de desarrollo: `http://127.0.0.1:8001/api`. En peticiones protegidas,
enviar `Authorization: Bearer <token>` y `Accept: application/json`.

## Denuncia de contenido

### POST /api/publication-reports

Requiere sesión (`401` sin token). Se envía **exactamente uno** de `project_id`
o `community_need_id`; el objetivo debe existir y ser público (`404` si no lo
es). El servidor obtiene `reporter_id` del token y fija `status = pending`.

| Campo | Regla |
|---|---|
| `project_id` / `community_need_id` | Exactamente uno, entero; nunca ambos. |
| `reason` | Obligatorio: `inappropriate`, `spam`, `misinformation` u `other`. |
| `details` | Texto opcional de hasta 1000 caracteres; obligatorio si `reason = other`. |
| `reporter_id`, `status`, `id` | No se permiten en el cuerpo. |

Ejemplo de denuncia de proyecto:

```json
{ "project_id": 12, "reason": "misinformation", "details": "La descripción contiene datos falsos." }
```

Ejemplo de denuncia de necesidad comunitaria:

```json
{ "community_need_id": 20, "reason": "other", "details": "Usa datos de otra comunidad." }
```

Respuesta `201`:

```json
{
  "report": {
    "id": 3,
    "reporter_id": 8,
    "project_id": 12,
    "community_need_id": null,
    "reason": "misinformation",
    "details": "La descripción contiene datos falsos.",
    "status": "pending",
    "created_at": "2026-11-08T12:00:00.000000Z"
  }
}
```

Cada usuario puede denunciar una vez cada publicación; otro usuario sí puede
denunciar el mismo contenido. La API devuelve `422` si hay duplicado, faltan
campos, se envían ambos IDs o la razón no es válida. Los registros se conservan
si la publicación pasa a `closed` o `withdrawn`; las claves foráneas impiden
eliminar físicamente el contenido denunciado. No existe todavía un flujo de
resolución de denuncias, por lo que su estado permanece `pending`.

### GET /api/admin/publication-reports

Lista paginada, 15 por página, ordenada de más reciente a más antigua.
Solo cuentas cuyos correos están configurados en `PROYECTATEC_ADMIN_EMAILS`
pueden consultarla (`403` para otra cuenta, `401` sin token).

```json
{
  "reports": [{ "id": 3, "reporter_id": 8, "project_id": 12, "community_need_id": null, "reason": "misinformation", "details": "La descripción contiene datos falsos.", "status": "pending", "created_at": "2026-11-08T12:00:00.000000Z" }],
  "meta": { "current_page": 1, "per_page": 15, "last_page": 1, "total": 1 }
}
```

## Resumen estadístico

### GET /api/admin/publication-stats

Requiere la misma cuenta administradora (`401`/`403` cuando corresponda).
Cuenta todos los registros de proyectos, necesidades comunitarias y necesidades
de proyectos por tipo y estado almacenado, incluso los cerrados o retirados.
No incluye solicitudes ni datos personales y no admite filtros avanzados.

```json
{
  "total": 5,
  "by_type": {
    "projects": { "total": 2, "by_status": { "closed": 1, "open": 1 } },
    "community_needs": { "total": 2, "by_status": { "open": 1, "withdrawn": 1 } },
    "project_needs": { "total": 1, "by_status": { "open": 1 } }
  }
}
```

Un estado sin registros no aparece en `by_status`; un tipo vacío devuelve
`{ "total": 0, "by_status": {} }`.

## Pruebas reproducibles

Desde la raíz del repositorio:

```bash
docker compose run --rm backend php artisan test --filter=PublicationReportsTest
docker compose run --rm backend php artisan test --filter=PublicationEditingTest
```

Las pruebas crean su propio esquema en la base de pruebas; no borran datos de
la base de desarrollo.
