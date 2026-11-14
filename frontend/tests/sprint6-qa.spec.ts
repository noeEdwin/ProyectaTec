import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = env.E2E_ADMIN_EMAIL || 'admin.demo@proyectatec.test';
const ADMIN_PASSWORD = env.E2E_ADMIN_PASSWORD || 'ProyectaTecDemo2026!';

test('catálogo filtra por texto, categoría, sector y combinaciones sin filtros duplicados', async ({ page }) => {
  // Iniciar sesión para acceder a /iniciativas (ruta protegida)
  await page.goto('/acceso');
  await page.getByLabel('Correo electrónico').fill('estudiante.demo@proyectatec.test');
  await page.getByLabel('Contraseña', { exact: true }).fill('ProyectaTecDemo2026!');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/iniciativas$/);

  await expect(page.getByRole('heading', { name: 'Iniciativas y residencias' })).toBeVisible();
  await expect(page.locator('.ic-tarjeta')).toHaveCount(6);

  // Verificar que no exista un selector duplicado de Categoría debajo de las píldoras
  await expect(page.locator('#catalogo-categoria')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Filtrar por categoría' })).toBeVisible();

  const sectorSelect = page.getByLabel('Sector de organización (solo proyectos)');
  await expect(sectorSelect).toBeVisible();

  // Filtrar por sector de organización (aplicación inmediata)
  await sectorSelect.selectOption('Tecnología e innovación');
  await expect(page).toHaveURL(/sector=Tecnolog/);
  await expect(page.locator('.ic-tarjeta').first()).toBeVisible();

  // Combinar con categoría
  await page.getByRole('group', { name: 'Filtrar por categoría' }).getByRole('button', { name: 'Tecnología' }).click();
  await expect(page).toHaveURL(/category_id=/);

  // Combinar con búsqueda que no arroje resultados -> estado vacío
  await page.getByLabel('Buscar iniciativas').fill('termino-inexistente-qa-xyz');
  await page.getByRole('button', { name: 'Buscar' }).click();
  await expect(page.getByText('No se encontraron iniciativas con esos criterios.')).toBeVisible();

  // Limpiar filtros recupera los resultados
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page).toHaveURL(/\/iniciativas$/);
  await expect(page.locator('.ic-tarjeta')).toHaveCount(6);
});

test('reportar publicación, moderar, impedir login de cuenta desactivada y evitar doble error 403', async ({ page }) => {
  const uid = randomUUID().slice(0, 8);
  const studentEmail = `qa-user-${uid}@gmail.com`;
  const password = 'Password123!';

  // 1. Registrar usuario común
  await page.goto('/registro');
  await page.getByLabel('Tipo de cuenta', { exact: true }).selectOption('estudiante');
  await page.getByLabel('Nombre completo').fill(`Usuario QA ${uid}`);
  await page.getByLabel('Institución educativa').selectOption('__other__');
  await page.getByLabel('Institución educativa').fill('Instituto Tecnológico de Oaxaca');
  await page.getByLabel('Campus o plantel').fill('Oaxaca');
  await page.getByLabel('Carrera o programa', { exact: true }).fill('Ingeniería en Sistemas');
  await page.getByLabel('Semestre o periodo').selectOption('5');
  await page.getByLabel('Matrícula').fill('20269901');
  await page.getByLabel('Fecha estimada de egreso').fill('2028-06');
  await page.getByLabel('País').selectOption('mexico');
  await page.getByLabel('Estado').selectOption('Oaxaca');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(studentEmail);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/catalogo$/);

  // Usuario común no puede acceder a moderación
  await page.goto('/admin/moderacion');
  await expect(page.getByRole('alert')).toContainText('No tienes permisos para acceder al panel de moderación.');

  // 2. Abrir detalle de publicación y reportarla
  await page.goto('/iniciativas');
  await page.locator('.ic-tarjeta .ic-enlace').first().click();
  await expect(page).toHaveURL(/\/(iniciativas|publicaciones)\/(proyecto|necesidad)\/\d+/);

  const tituloPublicacion = (await page.locator('h1').textContent())?.trim() ?? '';
  await page.getByRole('button', { name: 'Reportar publicación' }).click();
  await page.getByLabel('Motivo del reporte').selectOption('spam');
  await page.getByLabel(/Detalles/).fill(`Reporte automatizado QA ${uid}`);
  await page.getByRole('button', { name: 'Enviar reporte' }).click();
  await expect(page.getByRole('status')).toContainText('Reporte enviado. El equipo de moderación lo revisará.');

  // Cerrar sesión del usuario común
  await page.getByRole('button', { name: /Cuenta/ }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/acceso$/);

  // 3. Iniciar sesión como administrador
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/iniciativas$/);

  await page.goto('/admin/moderacion');
  await expect(page.getByRole('heading', { name: 'Panel de moderación' })).toBeVisible();

  // Verificar que el reporte aparece con etiqueta en español y resolverlo
  const reporteCard = page.locator('article.mod-item', { hasText: `Reporte automatizado QA ${uid}` });
  await expect(reporteCard).toBeVisible();
  await expect(reporteCard).toContainText('Spam');
  await reporteCard.getByRole('button', { name: 'Resolver' }).click();
  await page.getByLabel('Nota de decisión (obligatoria)').fill('Revisado por prueba automatizada QA.');
  await page.getByRole('button', { name: 'Marcar como revisado' }).click();
  await expect(page.getByRole('status').first()).toContainText('Marcar reporte como revisado');

  // Ocultar publicación y verificar que desaparece del catálogo (caché invalidada), luego restaurarla
  await page.getByRole('tab', { name: 'Publicaciones' }).click();
  const pubCard = page.locator('article.mod-item', { hasText: tituloPublicacion }).first();
  await pubCard.getByRole('button', { name: 'Ocultar' }).click();
  await page.getByRole('button', { name: 'Ocultar publicación' }).click();
  await expect(page.getByRole('status').first()).toContainText('Ocultar publicación');

  await page.goto('/iniciativas');
  await expect(page.locator('.ic-tarjeta h3', { hasText: tituloPublicacion })).toHaveCount(0);

  await page.goto('/admin/moderacion');
  await page.getByRole('tab', { name: 'Publicaciones' }).click();
  await page.locator('article.mod-item', { hasText: tituloPublicacion }).first().getByRole('button', { name: 'Restaurar' }).click();
  await page.getByRole('button', { name: 'Restaurar publicación' }).click();
  await expect(page.getByRole('status').first()).toContainText('Restaurar publicación');

  // 4. Desactivar al usuario común y comprobar mensaje limpio
  await page.getByRole('tab', { name: 'Usuarios' }).click();
  await page.getByLabel('Buscar').fill(studentEmail);
  const userCard = page.locator('article.mod-item', { hasText: studentEmail });
  await userCard.getByRole('button', { name: 'Desactivar usuario' }).click();
  await page.getByRole('button', { name: 'Desactivar cuenta' }).click();
  await expect(page.getByRole('status').first()).toContainText(`Cuenta desactivada: Usuario QA ${uid} (${studentEmail}) ya no podrá iniciar sesión.`);

  // Cerrar sesión del admin e intentar iniciar sesión con la cuenta desactivada
  await page.getByRole('button', { name: /Cuenta/ }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/acceso$/);

  await page.getByLabel('Correo electrónico').fill(studentEmail);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('alert')).toContainText('Esta cuenta está desactivada.');
  await expect(page).toHaveURL(/\/acceso$/);

  // Reactivar cuenta para dejar estado limpio
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/iniciativas$/);
  await page.goto('/admin/moderacion');
  await page.getByRole('tab', { name: 'Usuarios' }).click();
  await page.getByLabel('Buscar').fill(studentEmail);
  await page.locator('article.mod-item', { hasText: studentEmail }).getByRole('button', { name: 'Activar usuario' }).click();
  await page.getByRole('button', { name: 'Activar cuenta' }).click();
  await expect(page.getByRole('status').first()).toContainText('Cuenta activada:');
});

test('empresa pendiente intentando crear proyecto muestra un solo mensaje de error 403', async ({ page }) => {
  const uid = randomUUID().slice(0, 8);
  const password = 'Password123!';
  const orgEmail = `qa-org-${uid}@gmail.com`;

  await page.goto('/registro');
  await page.getByLabel('Tipo de cuenta', { exact: true }).selectOption('organizacion');
  await page.getByLabel('Nombre de la persona representante').fill('Representante QA');
  await page.getByLabel('Nombre público o razón social').fill(`Empresa QA ${uid}`);
  await page.getByLabel('Razón social legal').fill(`Empresa QA ${uid} S.A.`);
  await page.getByLabel('Sitio web (URL)').fill('https://empresa-qa.example.org');
  await page.getByLabel('Tipo de organización').selectOption('empresa');
  await page.getByLabel('Sector o actividad').selectOption('Tecnología e innovación');
  await page.getByLabel('Municipio', { exact: true }).selectOption('Oaxaca de Juárez');
  await page.getByLabel('Barrio, colonia o comunidad').fill('Centro');
  await page.getByLabel('Correo de contacto', { exact: true }).fill('contacto@empresa-qa.example.org');
  await page.getByLabel('Teléfono de contacto', { exact: true }).fill('9511234567');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(orgEmail);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/mi-perfil\?tipo=organizacion$/);

  await page.goto('/publicaciones/nueva');
  await page.getByLabel('Título').fill(`Proyecto empresa pendiente ${uid}`);
  await page.getByLabel('Categoría').selectOption({ index: 1 });
  await page.getByLabel('Descripción').fill('Descripción de prueba para validar mensaje de error único al publicar.');
  await page.getByRole('button', { name: 'Vista previa' }).click();
  await page.getByRole('button', { name: 'Publicar' }).click();

  // Debe aparecer exactamente UNA alerta de permisos, no duplicada
  const alertas = page.locator('[role="alert"]');
  await expect(alertas).toHaveCount(1);
  await expect(alertas.first()).toContainText('No tienes permisos');
});
