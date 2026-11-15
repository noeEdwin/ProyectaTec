#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/proyectatec}"
ENV_FILE="${APP_DIR}/.env.prod"
COMPOSE_FILE="${APP_DIR}/compose.prod.yaml"

cd "${APP_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "Falta ${ENV_FILE}. Créalo a partir de .env.prod.example antes de desplegar."
  exit 1
fi

echo "==> 1. Descargando últimos cambios de main..."
git pull --ff-only origin main

echo "==> 2. Construyendo y actualizando contenedores..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build

echo "==> 3. Ejecutando migraciones y optimizando caché de Laravel..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T backend php artisan migrate --force
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec -T backend php artisan optimize

echo "==> 4. Limpiando caché e imágenes Docker sin uso para conservar disco..."
docker image prune -f >/dev/null
docker builder prune -f --keep-storage=500mb >/dev/null

echo "==> Despliegue completado."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
