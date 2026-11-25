
# Auditoría de seguridad — Sprint 8

## ProyectaTec — Issue #119

### 1. Objetivo

Verificar la seguridad de los roles, permisos y acciones
restringidas de ProyectaTec, mediante la revisión de las
rutas de Laravel, políticas de autorización y pruebas
automatizadas.

### 2. Tecnologías verificadas

- Laravel y Laravel Sanctum.
- Middleware EnsureActiveUser.
- Policies y validaciones de autorización.
- React con Vite.
- PHPUnit para pruebas automatizadas.

### 3. Matriz de roles y permisos

| Rol | Acción | Respuesta esperada | Resultado |
|---|---|---|---|
| Visitante | Consultar rutas privadas | 401 | Aprobado |
| Usuario activo | Consultar información propia | 200 | Aprobado |
| Usuario desactivado | Acceder a rutas privadas | 403 | Aprobado |
| Usuario normal | Consultar panel administrativo | 403 | Aprobado |
| Administrador autorizado | Consultar panel administrativo | 200 | Aprobado |
| Usuario de organización sin permiso | Administrar plataforma | 403 | Aprobado |
| Usuario ajeno | Editar proyecto de otra persona | 403 | Aprobado |
| Autor autorizado | Editar proyecto propio | 200 | Aprobado |
| Usuario ajeno | Revisar solicitudes privadas | 403 | Aprobado |
| Usuario sin permiso | Publicar evidencias | 403 | Aprobado |
| Usuario no autorizado | Modificar campos protegidos | 422 | Aprobado |
| Visitante | Consultar proyecto oculto | 404 | Aprobado |
| Visitante | Consultar proyecto no público | 404 | Aprobado |

Los resultados corresponden a los escenarios cubiertos
por pruebas automatizadas de Laravel.

### 4. Rutas protegidas

Se utilizó el comando:

docker compose exec backend php artisan route:list --path=api -v

Se revisaron los middleware asociados a rutas privadas
y administrativas, incluyendo:

- auth:sanctum
- EnsureActiveUser

Las rutas públicas de consulta permanecen separadas de
las operaciones privadas y administrativas.

### 5. Permisos administrativos

Se verificaron mediante pruebas automatizadas:

- Moderación de usuarios.
- Moderación de publicaciones.
- Consulta de reportes.
- Resolución de reportes.
- Consulta de estadísticas administrativas.
- Acceso a paneles administrativos.
- Protección contra uso indebido del tipo de cuenta.

Los permisos administrativos dependen de la configuración
del backend y no del tipo de cuenta enviado por React.

### 6. Protección de proyectos y solicitudes

Las pruebas cubrieron:

- Rechazo de edición de proyectos ajenos.
- Protección de solicitudes privadas.
- Restricciones de proyectos ocultos.
- Restricciones de organizaciones pendientes.
- Autorización para publicar avances.
- Autorización para registrar comentarios.
- Autorización para subir evidencias.
- Validación de identificadores y campos protegidos.

### 7. Pruebas nuevas del Sprint 8

Archivo:

backend/tests/Feature/Sprint8SecurityAuditTest.php

Escenarios comprobados:

1. Visitantes no pueden acceder a endpoints privados.
2. Usuarios normales no pueden acceder a paneles admin.
3. Cuentas desactivadas no pueden usar rutas privadas.
4. El tipo de cuenta no concede permisos administrativos.
5. Administradores configurados pueden acceder a paneles.

Resultado:

5 pruebas aprobadas.
25 aserciones exitosas.

### 8. Resultado de la suite completa

Comando ejecutado:

docker compose exec backend php artisan test

Resultado:

- 251 pruebas aprobadas.
- 2198 aserciones exitosas.
- 0 pruebas fallidas.

### 9. Verificación del frontend

Comando ejecutado:

npm --prefix frontend run build

Resultado:

Compilación correcta con Vite.

Se observó una advertencia de rendimiento por un
archivo JavaScript mayor a 500 KB después de minificación.

Esta advertencia no impidió completar la compilación.

La compilación no demuestra por sí sola que las vistas
de React restrinjan correctamente todas las acciones.

La revisión manual de los controles visuales según
el rol del usuario permanece pendiente.

### 10. Hallazgos y limitaciones

Las pruebas ejecutadas finalizaron sin fallos.

No se identificaron errores mediante los escenarios
automatizados ejecutados.

Este resultado no equivale a garantizar la ausencia
total de vulnerabilidades.

Las pruebas automatizadas están configuradas para
utilizar SQLite en memoria.

La validación de seguridad en el entorno desplegado
y la revisión visual de roles en React requieren
comprobaciones adicionales.

### 11. Conclusión

La auditoría automatizada de ProyectaTec obtuvo
251 pruebas aprobadas y 2198 aserciones exitosas.

Se verificaron escenarios de autenticación,
autorización administrativa, permisos de proyectos,
solicitudes, comentarios y evidencias.

El frontend compiló correctamente.

Se recomienda completar la revisión manual de
acceso a vistas restringidas antes del cierre
definitivo de la actividad.

### 12. Referencias

Repositorio: noeEdwin/ProyectaTec

Sprint: 8 — Integración general y pruebas del sistema.

Issue: #119

Actividad relacionada con correcciones: #120.
