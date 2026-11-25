import { createProyectaTecSpec } from "../lib/proyectatec-base.ts";

const spec = createProyectaTecSpec({
  roleName: "organizacion",
  email: "organizacion.demo@proyectatec.test",
  password: "ProyectaTecDemo2026!",
  routes: [
    "/catalogo",
    "/publicaciones/nueva",
    "/mis-publicaciones",
    "/editar-perfil-organizacion",
    "/organizaciones",
    "/perfil",
    "/mi-perfil",
    "/perfil-publico",
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
