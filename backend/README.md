# Backend de ProyectaTec

Estructura inicial de Laravel 13 para la actividad **3.8.3 — Configuración inicial**.
Responsable: **Sánchez Chávez Edwin Noé**.

## Ejecución

Los comandos se ejecutan desde la raíz del repositorio, donde está `compose.yaml`.
Consulta la [guía de instalación del equipo](../README.md) para preparar una copia nueva.

```bash
docker compose up -d backend
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

## Configuración inicial

```dotenv
APP_NAME=ProyectaTec
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_LOCALE=es
DB_CONNECTION=pgsql
SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
```

`APP_KEY` se genera individualmente al preparar cada copia. Las sesiones y la caché
se guardan en archivos; las tareas de cola se ejecutan de forma síncrona.
Así, las rutas iniciales funcionan sin consultar una base de datos.

`DB_CONNECTION=pgsql` indica la tecnología prevista. PostgreSQL todavía no está
conectado: sus credenciales están comentadas en `.env.example`. Al abordar esa
etapa habrá que añadir el servicio de base de datos, la extensión PHP `pdo_pgsql`
y las credenciales acordadas por el equipo.

El modelo `User` y las migraciones incluidas son los ejemplos de Laravel; no
constituyen el diseño de tablas del Sprint 2 y no se han ejecutado.
Los archivos de Vite y `resources/` pertenecen a la plantilla de Laravel;
la interfaz React del equipo se desarrollará por separado en `frontend/`.

## Verificación

```bash
docker compose run --rm backend composer test
docker compose run --rm backend composer validate --strict
docker compose run --rm backend composer check-platform-reqs
```

## Explicación del avance

> Preparé la estructura inicial del backend con Laravel dentro de `backend/`.
> Configuré un entorno Docker con PHP y Composer, el archivo `.env` local y la
> clave de aplicación. Ajusté sesiones y caché para que Laravel pueda arrancar
> sin base de datos. Configuré las exclusiones de Git y comprobé el arranque
> mediante las rutas iniciales y las pruebas incluidas en Laravel.
