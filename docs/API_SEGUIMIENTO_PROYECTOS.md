# API de seguimiento de proyectos — ProyectaTec

## Sprint 7 — Issue #106

### Objetivo

Implementar en Laravel los servicios para consultar
participantes activos, registrar comentarios en avances
y administrar evidencias de proyectos.

## 1. Participantes activos

**Método:** GET

**Ruta:** `/api/projects/{project}/members`

Devuelve los participantes activos de un proyecto público.

La respuesta incluye:

- Identificador del participante.
- Nombre e identificador del usuario.
- Rol dentro del proyecto.
- Fecha de incorporación.
- Información de paginación.

No expone contraseñas ni correos electrónicos.

## 2. Comentarios en avances

### Consultar comentarios

**Método:** GET

**Ruta:** `/api/projects/{project}/updates/{update}/comments`

Devuelve una lista paginada de comentarios asociados
a un avance de proyecto visible públicamente.

### Registrar comentario

**Método:** POST

**Ruta:** `/api/projects/{project}/updates/{update}/comments`

Requiere autenticación mediante Laravel Sanctum.

Ejemplo de solicitud JSON:

{
  "content": "Se completó la primera etapa del proyecto."
}

El contenido es obligatorio y permite hasta 2000 caracteres.

El sistema identifica automáticamente al autor.

La creación está restringida mediante ProjectUpdatePolicy.

## 3. Archivos de evidencia

### Consultar evidencias de un proyecto

GET `/api/projects/{project}/files`

### Consultar evidencias de un avance

GET `/api/projects/{project}/updates/{update}/files`

### Descargar evidencia

GET `/api/projects/{project}/files/{file}/download`

### Subir evidencia a un proyecto

POST `/api/projects/{project}/files`

### Subir evidencia a un avance

POST `/api/projects/{project}/updates/{update}/files`

Las solicitudes POST requieren autenticación y permisos.

El archivo se envía mediante multipart/form-data
utilizando el campo `file`.

## 4. Validaciones de archivos

Formatos permitidos:

- PDF
- JPG/JPEG
- PNG
- WEBP
- TXT

Tamaño máximo: 5 MB.

Los archivos se almacenan en el disco privado
local de Laravel.

Las respuestas JSON no muestran la ruta interna
del archivo almacenado.

## 5. Seguridad

- Laravel Sanctum protege las operaciones de escritura.
- EnsureActiveUser bloquea cuentas desactivadas.
- ProjectUpdatePolicy determina quién puede publicar.
- Los proyectos ocultos no exponen sus evidencias.
- No se permite modificar campos protegidos.
- Se comprueba que el avance pertenezca al proyecto.

## 6. Respuestas HTTP

| Código | Significado |
|---|---|
| 200 | Consulta exitosa |
| 201 | Registro exitoso |
| 401 | Sin autenticación |
| 403 | Sin autorización |
| 404 | Recurso no disponible |
| 422 | Datos inválidos |

## 7. Pruebas automatizadas

Se ejecutaron:

- ProjectMemberApiTest: 6 pruebas aprobadas.
- ProjectCommentApiTest: 9 pruebas aprobadas.
- ProjectFileApiTest: 10 pruebas aprobadas.
- ProjectUpdateApiTest: 22 pruebas aprobadas.

Total: 47 pruebas y 387 aserciones aprobadas.

## 8. Integración con React

Los endpoints proporcionan datos JSON para consultar
participantes, comentarios y evidencias.

La carga de archivos utiliza multipart/form-data.

El frontend puede consumir estos servicios mediante
el cliente HTTP del proyecto.

## 9. Referencias

Repositorio: noeEdwin/ProyectaTec

Issue: #106 — Sprint 7.

La implementación complementa el módulo de avances
del Issue #105.
