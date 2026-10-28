import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { expect, test } from '@playwright/test';

test('registro → acceso privado → logout → login → acceso denegado', async ({ page }) => {
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'password123';

  await page.goto('/iniciativas');
  await expect(page).toHaveURL(/\/acceso$/);

  await page.getByRole('link', { name: 'Crear cuenta' }).click();
  await page.getByLabel('Nombre o razón social').fill('Usuario E2E');
  await page.getByLabel('Tipo de cuenta').selectOption('estudiante');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña').fill(password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/catalogo$/);
  await expect(page.getByText('Hola, Usuario E2E')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proyectos destacados' })).toBeVisible();

  await page.getByRole('button', { name: 'SALIR' }).click();
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
  await expect(page.getByText('Hola, Usuario E2E')).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
  await page.reload();
  await expect(page.getByText('Hola, Usuario E2E')).toBeVisible();

  await page.getByRole('button', { name: 'SALIR' }).click();
  await expect(page).toHaveURL(/\/acceso$/);
  const revoked = await page.request.get(`${env.API_BASE_URL || 'http://127.0.0.1:8001/api'}/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  expect(revoked.status()).toBe(401);
  await page.goto('/catalogo');
  await expect(page).toHaveURL(/\/acceso$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});
