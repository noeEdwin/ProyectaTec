# Despliegue y actualización en VPS (ProyectaTec)

## Arquitectura en producción (`compose.prod.yaml`)
- **web (`caddy:2-alpine`)**: sirve la SPA compilada (`frontend/dist`), gestiona HTTPS automático (Let's Encrypt) para `proyectatec.lat` y redirige `/api/*`, `/storage/*`, `/sanctum/*` hacia Laravel.
- **backend (`php:8.4-fpm` + `nginx`)**: ejecuta Laravel 13, conserva imágenes subidas en el volumen persistente `backend_storage`.
- **postgres (`postgres:16-alpine`)**: base de datos en volumen persistente `postgres_data`.

## Cómo actualizar el VPS después de hacer cambios en tu código
1. En tu máquina local, sube tus cambios a `main` en GitHub:
   ```bash
   git push origin main
   ```
2. En tu máquina local (o conectado por `ssh proyectatec`), ejecuta el script de redespliegue:
   ```bash
   ssh proyectatec "/opt/proyectatec/deploy/redeploy.sh"
   ```
   Esto descarga `main`, recompila frontend y backend si hubo cambios, corre `php artisan migrate --force` y refresca la caché sin perder datos ni imágenes.

## Desactivar el recuadro de cuentas demo en el login
Cuando tus compañeros terminen las pruebas:
1. En el VPS edita `/opt/proyectatec/.env.prod`:
   ```env
   VITE_SHOW_DEMO_ACCOUNTS=false
   ```
2. Recompila el servicio web:
   ```bash
   ssh proyectatec "cd /opt/proyectatec && docker compose -f compose.prod.yaml --env-file .env.prod up -d --build web"
   ```

## Comandos útiles de diagnóstico en el VPS
- Ver estado de contenedores: `docker compose -f compose.prod.yaml --env-file .env.prod ps`
- Ver logs en vivo: `docker compose -f compose.prod.yaml --env-file .env.prod logs -f`
- Correr seeders de demostración manualmente:
  `docker compose -f compose.prod.yaml --env-file .env.prod exec -T backend php artisan db:seed --class=DemoAccountsSeeder --force`
