# Perfiles y organizaciones

Abre `bruno/` como colección y selecciona el entorno **Local**. Usa primero **01 - Login para token**; las peticiones siguientes envían el Bearer token capturado.

## Flujo recomendado

1. Login para token.
2. Consultar el perfil; si todavía no existe, crear/guardar y después consultar o actualizar.
3. Crear una organización; la respuesta guarda su ID para consultar y editarla.
4. Para probar el `403`, configura `memberToken` y `foreignOrganizationId` en el entorno con un miembro no administrador y una organización ajena.

Los IDs y tokens son locales. No guardes credenciales ni tokens reales en Git.
