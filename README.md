# ProyectaTec

Sistema de vinculación e innovación para empresas, universidades y comunidades
de Oaxaca. Proyecto académico del equipo 02, Ingeniería en Sistemas Computacionales,
Instituto Tecnológico de Oaxaca.

## Backend — configuración inicial

El backend utiliza **Laravel 13, PHP 8.4 y Composer 2**, ejecutados con Docker.

```text
ProyectaTec/
├── backend/       # Aplicación Laravel
├── compose.yaml   # Entorno local de desarrollo
├── .gitignore
└── README.md
```

### Requisitos

- Git.
- Docker en ejecución y Docker Compose v2 o posterior.
- Puerto local `8000` disponible.

PHP y Composer se ejecutan dentro del contenedor.

### Primera instalación en una copia nueva

Clona el repositorio y abre una terminal en su carpeta raíz. Ejecuta en orden:

```bash
docker compose build backend
docker compose run --rm backend composer run setup
docker compose up -d backend
```

`setup` instala las dependencias de `composer.lock`, crea `backend/.env` a partir
de `backend/.env.example` si no existe y genera `APP_KEY`. Se utiliza en la primera
instalación; para actualizar dependencias de una copia existente usa
`docker compose run --rm backend composer install`, que conserva la clave.

En Linux, el contenedor utiliza UID/GID `1000:1000` por defecto. Si tu usuario
tiene otros identificadores, ejecuta esto en la misma terminal antes de los comandos:

```bash
export LOCAL_UID=$(id -u)
export LOCAL_GID=$(id -g)
```

### Uso diario

```bash
docker compose up -d backend
```

Abre **<http://localhost:8000>** para ver la bienvenida de Laravel.
La ruta **<http://localhost:8000/up>** comprueba que la aplicación arranca.

| Acción | Comando desde la raíz |
| --- | --- |
| Ver registros del servidor | `docker compose logs -f backend` |
| Ver información de Laravel | `docker compose exec backend php artisan about` |
| Listar rutas | `docker compose exec backend php artisan route:list` |
| Ejecutar pruebas | `docker compose run --rm backend composer test` |
| Detener el entorno | `docker compose down` |

El código se comparte con el contenedor mediante un volumen: los cambios en
`backend/` se reflejan directamente. Este entorno usa el servidor de desarrollo
de Laravel y está destinado al trabajo local.

### Archivos compartidos y locales

Se comparten el código fuente, `composer.json`, `composer.lock`, `.env.example`
y los archivos Docker. Git excluye `.env`, dependencias (`vendor/`, `node_modules/`),
registros, cachés, sesiones y archivos personales. Cada integrante obtiene sus
dependencias y su configuración local mediante la instalación inicial.

La configuración utiliza sesiones y caché en archivos, por lo que el arranque
no requiere PostgreSQL. Consulta [backend/README.md](backend/README.md) para
entender la estructura y explicar el avance de la actividad 3.8.3.
