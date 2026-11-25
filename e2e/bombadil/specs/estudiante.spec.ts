import { createProyectaTecSpec } from "../lib/proyectatec-base.ts";

const spec = createProyectaTecSpec({
  roleName: "estudiante",
  email: "estudiante.demo@proyectatec.test",
  password: "ProyectaTecDemo2026!",
  routes: [
    "/catalogo",
    "/iniciativas",
    "/iniciativas/mas",
    "/publicaciones",
    "/publicaciones/nueva",
    "/mis-publicaciones",
    "/mis-solicitudes",
    "/perfil",
    "/mi-perfil",
    "/perfil-publico",
    "/organizaciones",
  ],
});

export const {
  noHttpErrorCodes,
  noUncaughtExceptions,
  noUnhandledPromiseRejections,
  noConsoleErrors,
  page_not_blank,
  no_broken_images,
  no_horizontal_overflow,
  no_raw_english_or_server_errors,
  login_succeeds_promptly,
  no_dom_node_leak,
  no_js_heap_leak,
  explore,
} = spec;
