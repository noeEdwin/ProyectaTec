# Colección Postman de ProyectaTec

Importa `collections/ProyectaTec Perfiles y Organizaciones.postman_collection.json` y el entorno `environments/ProyectaTec Local.postman_environment.json`.

Selecciona **ProyectaTec Local** y ejecuta primero **00 - Autenticación auxiliar → Login para obtener token**. La colección guarda el Bearer token y, al crear datos, captura `profileId` y `organizationId` para las siguientes peticiones.

La prueba de autorización `403` requiere un `memberToken` de un usuario que no sea administrador de la organización indicada por `foreignOrganizationId`. Déjalos configurados localmente; no compartas tokens ni credenciales reales.

La base URL predeterminada es `http://127.0.0.1:8001`. Inicia Laravel desde la raíz del repositorio con `docker compose up -d backend`.
