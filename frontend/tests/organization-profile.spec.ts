import { expect, test } from '@playwright/test';

test('administrador puede consultar, editar, guardar y volver a consultar su organización', async ({ page }) => {
  let name = 'Colectivo Semilla';
  let description = 'Innovación social';
  let location = 'Oaxaca';

  await page.addInitScript(() => localStorage.setItem('token', 'token-e2e'));
  await page.route('**/api/me', (route) => route.fulfill({
    json: { id: 7, name: 'Ana', email: 'ana@example.com', account_type: 'sector_social' },
  }));
  await page.route('**/api/me/organizations', (route) => route.fulfill({
    json: {
      organizations: [{
        id: 17,
        name,
        organization_type: 'sector_social',
        description,
        sector: 'Comunidad',
        location,
        image: null,
        image_url: null,
        classification: 'sector_social - Comunidad',
        role: 'admin',
        status: 'active',
        can_update: true,
        approval_status: 'approved',
      }],
    },
  }));
  await page.route('**/api/organizations/17', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON() as { name: string; description: string; location: string };
      name = body.name;
      description = body.description;
      location = body.location;
      await route.fulfill({ json: { organization: { id: 17, name, description, location } } });
      return;
    }
    await route.fulfill({
      json: {
        organization: {
          id: 17,
          is_organization: true,
          name,
          description,
          location,
          image: null,
          image_url: null,
          classification: 'sector_social - Comunidad',
          contact: { email: null, phone: null },
        },
      },
    });
  });

  await page.goto('/mi-perfil?tipo=organizacion&id=17');
  await expect(page.getByRole('heading', { name: 'Colectivo Semilla' })).toBeVisible();
  await page.getByRole('link', { name: 'Editar perfil' }).click();
  await expect(page.getByRole('heading', { name: 'Editar organización' })).toBeVisible();
  await page.getByLabel('Nombre o razón social').fill('Colectivo Semilla Oaxaca');
  await page.getByLabel('Descripción').fill('Proyectos comunitarios de tecnología');
  await page.getByLabel('Ubicación', { exact: true }).fill('Valles Centrales');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toContainText('Los cambios se guardaron correctamente.');

  await page.reload();
  await expect(page.getByLabel('Nombre o razón social')).toHaveValue('Colectivo Semilla Oaxaca');
  await expect(page.getByLabel('Descripción')).toHaveValue('Proyectos comunitarios de tecnología');
  await expect(page.getByLabel('Ubicación', { exact: true })).toHaveValue('Valles Centrales');

  await page.goto('/mi-perfil?tipo=organizacion&id=17');
  await page.getByRole('link', { name: /Ver perfil público/ }).click();
  await expect(page.getByRole('heading', { name: 'Colectivo Semilla Oaxaca' })).toBeVisible();
});

test('miembro sin permisos no puede abrir el editor de organización', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('token', 'token-e2e'));
  await page.route('**/api/me', (route) => route.fulfill({
    json: { id: 8, name: 'Luis', email: 'luis@example.com', account_type: 'estudiante' },
  }));
  await page.route('**/api/me/organizations', (route) => route.fulfill({
    json: {
      organizations: [{
        id: 18,
        name: 'Centro Educativo',
        organization_type: 'institucion_educativa',
        description: null,
        sector: null,
        location: null,
        image: null,
        image_url: null,
        classification: 'institucion_educativa',
        role: 'member',
        status: 'active',
        can_update: false,
        approval_status: 'approved',
      }],
    },
  }));

  await page.goto('/mi-perfil?tipo=organizacion&id=18');
  await expect(page.getByRole('heading', { name: 'Centro Educativo' })).toBeVisible();
  await expect(page.getByText('Sin permisos para editar esta organización')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar perfil' })).toHaveCount(0);

  await page.goto('/editar-perfil-organizacion?id=18');
  await expect(page.getByText('Tu membresía no tiene permiso para editar esta organización.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toHaveCount(0);
});

test('cuenta personal carga perfil existente, lo guarda y conserva cambios al recargar', async ({ page }) => {
  let description = 'Estudiante de ingeniería';
  let location = 'Oaxaca';
  let interestAreas: string[] = [];
  let publicFields: string[] = [];
  await page.addInitScript(() => localStorage.setItem('token', 'token-e2e'));
  await page.route('**/api/me', (route) => route.fulfill({
    json: { id: 9, name: 'María López', email: 'maria@example.com', account_type: 'estudiante' },
  }));
  await page.route('**/api/profile', (route) => route.fulfill({
    json: {
      data: {
        id: 21,
        display_name: 'María López',
        description,
        phone: '9511234567',
        location,
        institution: 'ITO',
        field_of_study: 'Sistemas',
        interest_areas: interestAreas,
        public_fields: publicFields,
        email: 'maria@example.com',
        account_type: 'estudiante',
      },
    },
  }));
  await page.route('**/api/me/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON() as {
        description: string;
        location: string;
        field_of_study: string;
        interest_areas: string[];
        public_fields: string[];
      };
      description = payload.description;
      location = payload.location;
      interestAreas = payload.interest_areas;
      publicFields = payload.public_fields;
      expect(payload.field_of_study).toBe('Sistemas');
    }
    await route.fulfill({ json: { data: { display_name: 'María López', description, location, interest_areas: interestAreas, public_fields: publicFields } } });
  });

  await page.goto('/perfil');
  await expect(page.getByLabel('Nombre o razón social')).toHaveValue('María López');
  await expect(page.getByLabel('Correo de contacto')).toHaveValue('maria@example.com');
  await page.getByLabel('Institución educativa').fill('Instituto Tecnológico de Oaxaca');
  await page.getByLabel('Campus o plantel').fill('Oaxaca');
  await page.getByLabel('Carrera o programa', { exact: true }).fill('Sistemas');
  await page.getByLabel('Semestre o periodo').fill('5');
  await page.getByLabel('Matrícula').fill('ITO-222');
  await page.getByLabel('Fecha estimada de egreso').fill('2028-06');
  await page.getByLabel('Descripción breve').fill('Desarrolladora interesada en impacto social');
  await page.getByLabel('País').selectOption('mexico');
  await page.getByLabel('Estado').selectOption('Oaxaca');
  await page.getByRole('checkbox', { name: 'Agroindustria y alimentos' }).check();
  await page.getByRole('checkbox', { name: 'Mostrar áreas de interés en mi perfil público' }).check();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('¡Perfil guardado exitosamente!')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Descripción breve')).toHaveValue('Desarrolladora interesada en impacto social');
  await expect(page.getByLabel('Estado')).toHaveValue('Oaxaca');
  await expect(page.getByRole('checkbox', { name: 'Agroindustria y alimentos' })).toBeChecked();
  await expect(page.getByLabel('Carrera o programa', { exact: true })).toHaveValue('Sistemas');
  await page.goto('/perfil-publico');
  await expect(page.getByText('Agroindustria y alimentos')).toBeVisible();
});

test('el registro cambia los campos obligatorios según el tipo de cuenta', async ({ page }) => {
  await page.goto('/registro');
  const type = page.getByLabel('Tipo de cuenta', { exact: true });

  await type.selectOption('estudiante');
  await expect(page.getByLabel('Matrícula')).toBeVisible();
  await expect(page.getByLabel('Institución educativa')).toBeVisible();
  await expect(page.getByLabel('Nombre de la persona representante')).toHaveCount(0);

  await type.selectOption('academico');
  await expect(page.getByLabel('Actividad académica', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Matrícula')).toHaveCount(0);

  await type.selectOption('empleado_organizacion');
  await expect(page.getByLabel('Organización', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Área o departamento')).toBeVisible();

  await type.selectOption('residente_oaxaca');
  await expect(page.getByLabel('Municipio', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Barrio, colonia o comunidad', { exact: true })).toBeVisible();

  await type.selectOption('organizacion');
  await expect(page.getByLabel('Nombre de la persona representante')).toBeVisible();
  await expect(page.getByLabel('Nombre público o razón social')).toBeVisible();
  await expect(page.getByLabel('Tipo de organización')).toBeVisible();
  await expect(page.getByLabel('Correo de contacto', { exact: true })).toBeVisible();
});
