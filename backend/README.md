# Backend de ProyectaTec

Estructura inicial de Laravel 13 para la actividad **3.8.3 — Configuración inicial**.
Responsable: **Sánchez Chávez Edwin Noé**.

## Ejecución

Los comandos se ejecutan desde la raíz del repositorio, donde está `compose.yaml`.
Consulta la [guía de instalación del equipo](../README.md) para preparar una copia nueva.

```bash
docker compose build backend
docker compose up -d postgres backend
```

- Bienvenida de Laravel: <http://localhost:8000>
- Comprobación de arranque: <http://localhost:8000/up>

PHP 8.4 y Composer 2 están dentro del contenedor. Para ejecutar Artisan:

```bash
docker compose exec backend php artisan about
docker compose exec backend php artisan route:list
```

## Estructura

| Carpeta o archivo | Función |
| --- | --- |
| `app/` | Código de la aplicación; incluye las bases de controladores y modelos. |
| `bootstrap/` | Arranque de Laravel y registro de rutas. |
| `config/` | Configuración de servicios de Laravel. |
| `database/` | Migraciones, factories y seeders de la plantilla oficial. |
| `public/` | Punto de entrada HTTP. |
| `resources/` | Recursos y vista de bienvenida de la plantilla Laravel. |
| `routes/web.php` | Ruta inicial `/`. |
| `storage/` | Sesiones, caché, vistas compiladas y registros locales. |
| `tests/` | Pruebas iniciales incluidas en Laravel. |
| `.env` | Configuración local, excluida de Git. |
| `.env.example` | Plantilla compartida para configurar cada equipo. |
| `composer.lock` | Versiones exactas de las dependencias; se comparte en Git. |

## PostgreSQL de desarrollo

El archivo `compose.yaml` define un servicio PostgreSQL 16 con la base
`proyectatec_dev`, el usuario `proyectatec` y una contraseña de desarrollo.
El servicio utiliza un volumen Docker llamado `postgres_data` para conservar
la información entre reinicios.

Laravel usa el nombre del servicio Docker como host:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=proyectatec_dev
DB_USERNAME=proyectatec
DB_PASSWORD=proyectatec_dev_password
```

El contenedor de PHP instala la extensión `pdo_pgsql`, que es el controlador
necesario para que Laravel se conecte a PostgreSQL.

Para verificar el controlador y la conexión:

```bash
docker compose exec backend php -m | grep -E '^PDO$|pdo_pgsql'
docker compose exec backend php artisan db:show
docker compose exec backend php artisan migrate:status
```

En una instalación nueva, `docker compose up -d postgres backend` crea la base
automáticamente. Si se necesita reiniciarla desde cero, se puede eliminar el
volumen con `docker compose down -v`; esto borra todos los datos locales.

## Configuración de Laravel

```dotenv
APP_NAME=ProyectaTec
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=es
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=proyectatec_dev
DB_USERNAME=proyectatec
DB_PASSWORD=proyectatec_dev_password
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

`APP_KEY` se genera individualmente al preparar cada copia. Las sesiones y la caché
se guardan en archivos; las tareas de cola se ejecutan de forma síncrona.

El modelo `User` y las migraciones incluidas son los ejemplos de Laravel; no
constituyen el diseño de tablas del Sprint 2 y no se han ejecutado.
Los archivos de Vite y `resources/` pertenecen a la plantilla de Laravel;
la interfaz React del equipo se desarrollará por separado en `frontend/`.

## Verificación

```bash
docker compose run --rm backend composer test
docker compose run --rm backend composer validate --strict
docker compose run --rm backend composer check-platform-reqs
docker compose exec backend php -m | grep -E '^PDO$|pdo_pgsql'
docker compose exec backend php artisan db:show
docker compose exec backend php artisan migrate:status
```

## Explicación del avance

> Preparé la estructura inicial del backend con Laravel dentro de `backend/`.
> Configuré un entorno Docker con PHP, Composer y PostgreSQL. La aplicación usa
> la base de desarrollo `proyectatec_dev`, habilité el controlador `pdo_pgsql` y
> comprobé la conexión mediante Artisan. Las credenciales locales se mantienen
> fuera de Git y el equipo comparte únicamente `.env.example`.
