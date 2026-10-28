# Colección Bruno de ProyectaTec

Abre la carpeta `bruno/` como colección en Bruno y selecciona el entorno **Local**.
Desde la raíz del repositorio, inicia la API con `docker compose up -d backend`.
La URL publicada por `compose.yaml` es `http://127.0.0.1:8001` (el puerto
`8000` es interno al contenedor).

## Flujo recomendado

1. Envía **Diagnóstico / Salud** para comprobar que Laravel responde.
2. Si necesitas datos de prueba, ejecuta desde la raíz
   `docker compose run --rm backend php artisan migrate` y después
   `docker compose run --rm backend php artisan db:seed`.
3. Envía **Autenticación / Login**. El ejemplo usa `test@example.com` y
   `password`, creados por el seeder. Login guarda el `access_token` en la
   variable temporal `token` de Bruno; las solicitudes protegidas envían
   `Authorization: Bearer {{token}}`.
4. Prueba **Mi usuario** y los `PATCH` que necesites. **Logout** revoca el
   token actual y limpia la variable temporal; déjalo para el final.

**Registro** crea un usuario real y también captura su token. El correo de
ejemplo usa `{{$guid}}` para evitar duplicados en ejecuciones posteriores;
Laravel devolverá `422` si intentas registrar manualmente un correo existente.
El backend requiere
`name`, `email`, `password` (mínimo 8 caracteres), `password_confirmation` y
`account_type`. Los endpoints de autenticación usan **tokens Bearer**; la ruta
`/sanctum/csrf-cookie` se incluye solo para inspeccionar el soporte de cookies
de Sanctum, no se necesita para este flujo.

Los ID `projectId`, `organizationId` y `applicationId` del entorno son ejemplos
para la base de datos recién sembrada. Comprueba sus valores reales en DBeaver
si tu base ya tenía registros. Para modificar proyectos debes iniciar sesión
como su creador; para organizaciones, como un miembro admin activo; para
solicitudes, como creador del proyecto asociado o admin activo de la
organización. Con los seeders actuales, `test@example.com` es creador de los
proyectos y admin de la organización Instituto Tecnológico de Oaxaca; la
solicitud de ejemplo pertenece al primer proyecto. Los `PATCH` modifican
registros reales: ajusta los valores antes de probar cambios específicos.

La colección cubre todas las rutas de `routes/api.php`, más `/`, `/up` y
`/sanctum/csrf-cookie`. Las rutas dinámicas `/storage/{path}` y la ruta interna
`/_boost/browser-logs` son de Laravel/Boost en desarrollo y no forman parte
de la API de la aplicación.
