import { createProyectaTecSpec } from "../lib/proyectatec-base.ts";

const spec = createProyectaTecSpec({
  roleName: "guest",
  routes: ["/", "/acceso", "/registro", "/olvide-contrasena", "/organizaciones"],
  allowLogout: true,
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
  no_dom_node_leak,
  no_js_heap_leak,
  explore,
} = spec;
