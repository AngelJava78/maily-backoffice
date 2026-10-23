import { configure, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import {
  ADMIN_SUB,
  createUsersDirectoryMock,
  defaultDirectory,
} from '@/test/handlers/usersDirectory';
import { renderApp } from '@/test/renderApp';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await import('@/features/modules/components/ModulesPage');
}, 90_000);

function start() {
  const directory = createUsersDirectoryMock(defaultDirectory());
  directory.grant('Administrator', 'modules:read');
  directory.grant('Administrator', 'modules:write');
  directory.grant('Administrator', 'modules:update');
  directory.grant('Administrator', 'modules:delete');
  return { directory, modules: createModulesCatalogMock({ directory }) };
}

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

describe('the modules section: creating (feature 013, user story 2)', () => {
  it('creates a module with two of its actions and shows it in the catalog at once (W6)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
    await user.click(screen.getByRole('radio', { name: /Sistema/ }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'audit');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Auditoría');
    await user.click(screen.getByRole('checkbox', { name: /Crear/ }));
    await user.click(screen.getByRole('checkbox', { name: /Modificar/ }));
    await user.click(screen.getByRole('checkbox', { name: /Eliminar/ }));
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(await screen.findByText('Módulo creado.')).toBeInTheDocument();
    const row = await screen.findByRole('row', { name: /Auditoría/ });
    expect(row).toHaveTextContent('Ver');
    expect(row).not.toHaveTextContent('Crear');
    expect(screen.getByText('24 módulos activos')).toBeInTheDocument();
  });

  it('rejects a key already used by another module, without creating anything (W7)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'users');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Otro');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(await screen.findByText('Ya existe un módulo con esa clave.')).toBeInTheDocument();
    expect(screen.getByText('23 módulos activos')).toBeInTheDocument();
  });

  it('explains the expected key format before saving (W8)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'Audit');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Auditoría');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));

    expect(
      await screen.findByText(
        'Usa minúsculas, números y guion bajo, empezando con una letra (hasta 50 caracteres).',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('23 módulos activos')).toBeInTheDocument();
  });

  it('leaves a module created without an order at the end of all of them, not just its type (W9, research D13)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
    await user.click(screen.getByRole('radio', { name: /Sistema/ }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'audit');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Auditoría');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));
    await screen.findByText('Módulo creado.');

    // The greatest sort_order of all 23 seeded modules is 150 (Facturación, Clínica): the new one,
    // of Sistema, must still land after it, not after Sistema's own greatest (80, Módulos).
    const row = await screen.findByRole('row', { name: /Auditoría/ });
    expect(row).toHaveTextContent('160');
  });
});
