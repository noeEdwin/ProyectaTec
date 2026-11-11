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

La colección incluye solicitudes para las rutas de la aplicación, más `/`, `/up` y
`/sanctum/csrf-cookie`. Las rutas dinámicas `/storage/{path}` y la ruta interna
`/_boost/browser-logs` son de Laravel/Boost en desarrollo y no forman parte
de la API de la aplicación.

## Proyectos y necesidades — tarea #61

Abre `bruno/` como colección y selecciona el entorno **Local**. Comprueba que
`baseUrl` apunte al backend deseado: la variable no incluye `/api`; las
solicitudes agregan ese prefijo. Consulta el contrato completo en
[API de proyectos y necesidades](../docs/API_PROYECTOS_NECESIDADES.md).

Antes de crear proyectos o necesidades comunitarias, configura `categoryId` con
un identificador entero real de la base utilizada. Consulta el catálogo público
`GET /api/categories`, que devuelve `categories` con `id` y `name`; los IDs no
son universales. El marcador del entorno no es un ID válido: configura la
variable exclusivamente como un entero válido, sin comillas; el marcador inicial
no permite ejecutar correctamente estos POST porque no produce un número JSON.

Para las solicitudes protegidas, utiliza **Perfiles / Login para token** con
credenciales locales de prueba configuradas en Bruno. Un login exitoso guarda
`token` temporalmente; no compartas tokens ni credenciales privadas. Los GET
de estas tres carpetas son públicos.

### Búsqueda y filtros de publicaciones — tarea 3.13.1

Las solicitudes **Listar proyectos** y **Listar necesidades comunitarias** se
conservan sin filtros como ejemplos de regresión. Las solicitudes adicionales
de esas carpetas muestran `q`, `category_id` y combinaciones; proyectos también
incluye `sector`. Son GET públicos y no necesitan token. Sustituye el ID `2` y
el sector `Educación` por valores reales del entorno; los ejemplos no modifican
las variables existentes. Un sector inexistente o una categoría positiva sin
coincidencias devuelve `200` con una lista vacía.

`q` busca subcadenas literales en título o descripción e ignora mayúsculas ASCII;
no se garantiza equivalencia Unicode completa entre motores. Los filtros se
combinan con AND y los espacios externos de `q` y `sector` se recortan. Con
sector se excluyen proyectos individuales; sin él siguen visibles. Necesidades
comunitarias no filtra por sector ni apoyo. Las respuestas mantienen su arreglo
`projects` o `community_needs` y `meta`, con 15 elementos por página. Consulta
el contrato enlazado para visibilidad, validación y detalles de paginación.

La integración de estos parámetros y la paginación en React queda para una tarea
posterior: el catálogo actual filtra localmente una cantidad limitada de
resultados. Se reportaron 36 pruebas y 444 verificaciones aprobadas con SQLite en
memoria; la validación específica en PostgreSQL está pendiente. El filtro de
apoyo no está implementado y requiere definición de Alessandro.

### Recorrido recomendado

1. En **Proyectos**, ejecuta **Crear proyecto** y comprueba `201`. Se crea un
   proyecto personal. Luego prueba **Listar proyectos** y **Consultar proyecto**.
2. Con el mismo usuario creador, ejecuta **Necesidades de proyectos / Crear
   necesidad de proyecto**, comprueba `201` y prueba el listado y el detalle.
3. En **Necesidades comunitarias**, crea una necesidad, comprueba `201` y prueba
   su listado y detalle. Una necesidad comunitaria es independiente del proyecto.

Los tres POST **insertan registros reales** en la base configurada: ejecútalos
solo en un entorno de prueba autorizado. Cualquier usuario autenticado puede
crear un proyecto personal o una necesidad comunitaria. Para publicar un
proyecto en nombre de una organización se requiere membresía `admin` y `active`;
el ejemplo de esta colección no envía organización. Para crear una necesidad
de proyecto, el usuario debe ser el creador del proyecto público: ser admin de
su organización no basta.

Cada POST establece previamente solo su ID temporal correspondiente en `0`
para evitar reutilizar el ID anterior si falla; no modifica el token. Tras un
`201` con ID presente, captura `projectId`, `communityNeedId` o `projectNeedId`
desde la respuesta. Comprueba siempre el estado y la variable antes de seguir;
si el POST falla o no captura un ID, `0` es solo un marcador, no un recurso.

Para consultar registros existentes, introduce manualmente sus identificadores
en las variables de Bruno. Si existe una variable temporal con el mismo nombre,
actualízala o elimínala para que no prevalezca sobre la del entorno. Recuerda que
`projectId` también lo utiliza el **PATCH** de proyectos anterior: revisa su
valor antes de ejecutarlo. `projectNeedId` debe pertenecer al `projectId` actual;
si cambias de proyecto, selecciona también una necesidad correspondiente.
