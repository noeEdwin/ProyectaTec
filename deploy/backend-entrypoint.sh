#!/usr/bin/env sh
set -eu

mkdir -p \
  /var/www/html/storage/app/public \
  /var/www/html/storage/app/private \
  /var/www/html/storage/framework/cache \
  /var/www/html/storage/framework/sessions \
  /var/www/html/storage/framework/views \
  /var/www/html/storage/logs \
  /var/www/html/bootstrap/cache

chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

rm -f /var/www/html/public/storage
php artisan storage:link --no-interaction
php artisan optimize --no-interaction

php-fpm -D
exec nginx -g 'daemon off;'
