import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { expect, test } from '@playwright/test';

test('registro → acceso privado → logout → login → acceso denegado', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'password123';

  await page.goto('/iniciativas');
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByText('Tipo de Usuario')).toHaveCount(0);

  await page.getByRole('link', { name: 'Crear cuenta' }).click();
  await page.getByLabel('Nombre completo').fill('Usuario E2E');
  await page.getByLabel('Tipo de cuenta').selectOption('estudiante');
  await page.getByLabel('Institución educativa').selectOption('__other__');
  await page.getByLabel('Institución educativa').fill('Instituto Tecnológico de Oaxaca');
  await page.getByLabel('Campus o plantel').fill('Oaxaca');
  await page.getByLabel('Carrera o programa', { exact: true }).fill('Ingeniería en Sistemas');
  await page.getByLabel('Semestre o periodo').selectOption('5');
  await page.getByLabel('Matrícula').fill('E2E-0001');
  await page.getByLabel('Fecha estimada de egreso').fill('2028-06');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByRole('button', { name: /UE Cuenta/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proyectos destacados' })).toBeVisible();

  await page.getByRole('button', { name: /Cuenta/ }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  await page.goto('/iniciativas');
  await expect(page).toHaveURL(/\/acceso$/);

  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('alert')).toContainText('Credenciales inválidas');

  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/iniciativas$/);
  await expect(page.getByRole('button', { name: /UE Cuenta/ })).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('button', { name: /UE Cuenta/ })).toBeVisible();

  await page.getByRole('button', { name: /Cuenta/ }).click();
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  const revoked = await page.request.get(`${env.API_BASE_URL || 'http://127.0.0.1:8001/api'}/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(revoked.status()).toBe(401);
  await page.goto('/catalogo');
  await expect(page).toHaveURL(/\/acceso$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});

test('registro de organización crea perfil pendiente y lo oculta del catálogo público', async ({ page }) => {
  const email = `organizacion-e2e-${randomUUID()}@example.com`;
  await page.goto('/registro');
  await page.getByLabel('Tipo de cuenta', { exact: true }).selectOption('organizacion');
  await page.getByLabel('Nombre de la persona representante').fill('Representante E2E');
  await page.getByLabel('Nombre público o razón social').fill('Cooperativa E2E');
  await page.getByLabel('Razón social legal').fill('Cooperativa E2E S.C.');
  await page.getByLabel('Sitio web (URL)').fill('https://cooperativa.example.org');
  await page.getByLabel('Tipo de organización').selectOption('sector_social');
  await page.getByLabel('Sector o actividad').fill('Economía comunitaria');
  await page.getByLabel('Municipio', { exact: true }).fill('Oaxaca de Juárez');
  await page.getByLabel('Barrio, colonia o comunidad').fill('Centro');
  await page.getByLabel('Correo de contacto', { exact: true }).fill('contacto@cooperativa.example.org');
  await page.getByLabel('Teléfono de contacto', { exact: true }).fill('9511234567');
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('password123');
  await page.getByLabel('Confirmar contraseña').fill('password123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/mi-perfil\?tipo=organizacion$/);
  await expect(page.getByRole('heading', { name: 'Cooperativa E2E' })).toBeVisible();
  await expect(page.getByText('Registro pendiente de aprobación por ProyectaTec')).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.get(`${env.API_BASE_URL || 'http://127.0.0.1:8001/api'}/me/organizations`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
  const { organizations } = await response.json();
  const publicResponse = await page.request.get(`${env.API_BASE_URL || 'http://127.0.0.1:8001/api'}/organizations/${organizations[0].id}`);
  expect(publicResponse.status()).toBe(404);
});
