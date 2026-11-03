import { configure, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
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

/** The real 23-module catalog plus: a parent (500) with a submodule (501), a loose module (502) and another parent (503). */
function start() {
  const directory = createUsersDirectoryMock(defaultDirectory());
  directory.grant('Administrator', 'modules:read');
  directory.grant('Administrator', 'modules:write');
  directory.grant('Administrator', 'modules:update');
  directory.grant('Administrator', 'modules:delete');
  const modules = createModulesCatalogMock({ directory });
  modules.addModule(
    catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre', sortOrder: 5 }),
  );
  modules.addModule(
    catalogModule({
      id: 501,
      key: 'demo_child',
      name: 'Demo hija',
      sortOrder: 10,
      parentModuleId: 500,
    }),
  );
  modules.addModule(
    catalogModule({ id: 502, key: 'demo_loose', name: 'Demo suelto', sortOrder: 6 }),
  );
  modules.addModule(catalogModule({ id: 503, key: 'demo_other', name: 'Demo otro', sortOrder: 7 }));
  return { directory, modules };
}

const TOTAL = '26 módulos y 1 submódulo activo';

function open(url: string) {
  return renderApp({ url, sub: ADMIN_SUB, signedIn: true });
}

type User = ReturnType<typeof open>['user'];

async function openEditFor(user: User, rowName: RegExp) {
  const row = await screen.findByRole('row', { name: rowName });
  await user.click(within(row).getByRole('button', { name: 'Editar' }));
}

async function closeDialog(user: User) {
  await user.keyboard('{Escape}');
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
}

const parentField = () => screen.getByRole('combobox', { name: 'Módulo padre' });

async function waitForOptions() {
  await waitFor(() => {
    expect(parentField()).not.toHaveAttribute('aria-disabled', 'true');
  });
}

async function choose(user: User, option: string) {
  await user.click(parentField());
  await user.click(await screen.findByRole('option', { name: option }));
}

function rowTexts(): string[] {
  return screen.getAllByRole('row').map((row) => row.textContent);
}

describe('the modules section: choosing the parent (feature 024, user story 2)', () => {
  it('creates a submodule choosing its parent in the same form, and shows it under the parent, expanded', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);
    // The parent is collapsed: it must open by itself to show the new module (FR-013).
    await user.click(screen.getByRole('button', { name: '1 submódulo de Demo padre' }));
    expect(screen.queryByRole('row', { name: /Demo hija/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Nuevo módulo' }));
    await user.type(screen.getByRole('textbox', { name: 'Clave' }), 'demo_new');
    await user.type(screen.getByRole('textbox', { name: 'Nombre' }), 'Demo nuevo');
    await waitForOptions();
    await choose(user, 'Demo padre');
    await user.click(screen.getByRole('button', { name: 'Crear módulo' }));
    expect(await screen.findByText('Módulo creado.')).toBeInTheDocument();
    await closeDialog(user);

    expect(await screen.findByText('26 módulos y 2 submódulos activos')).toBeInTheDocument();
    const texts = rowTexts();
    const parentAt = texts.findIndex((text) => /^5\s*Demo padre/.test(text));
    expect(texts[parentAt + 1]).toContain('Demo hija');
    expect(texts[parentAt + 2]).toContain('Demo nuevo');
  });

  it('makes a top-level module a submodule, changes its parent and then removes it, without reloading', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    // Assign.
    await openEditFor(user, /^6\s*Demo suelto/);
    await waitForOptions();
    await choose(user, 'Demo padre');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');
    await closeDialog(user);
    expect(await screen.findByText('25 módulos y 2 submódulos activos')).toBeInTheDocument();
    let texts = rowTexts();
    // Its order (6) is lower than that of its new sibling (10): it goes right under the parent.
    expect(texts[texts.findIndex((text) => /^5\s*Demo padre/.test(text)) + 1]).toContain(
      'Demo suelto',
    );

    // Change.
    await openEditFor(user, /Demo suelto/);
    await waitForOptions();
    expect(parentField()).toHaveTextContent('Demo padre');
    await choose(user, 'Demo otro');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');
    await closeDialog(user);
    texts = rowTexts();
    expect(texts[texts.findIndex((text) => /^7\s*Demo otro/.test(text)) + 1]).toContain(
      'Demo suelto',
    );

    // Remove.
    await openEditFor(user, /Demo suelto/);
    await waitForOptions();
    await choose(user, 'Ninguno (módulo de primer nivel)');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await screen.findByText('Cambios guardados.');
    await closeDialog(user);
    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^6\s*Demo suelto/ })).toBeInTheDocument();
  });

  it('locks the parent of a module that has submodules and of a base module, saying why', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);

    await openEditFor(user, /^5\s*Demo padre/);
    expect(parentField()).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Este módulo tiene submódulos, así que no puede tener un módulo padre.'),
    ).toBeInTheDocument();
    await closeDialog(user);

    await openEditFor(user, /Usuarios/);
    expect(parentField()).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Los módulos base de administración no tienen módulo padre.'),
    ).toBeInTheDocument();
  });

  it('shows the refusal next to the field when someone else deleted the parent meanwhile, and keeps what was written', async () => {
    const { modules } = start();
    const { user } = open('/modules');
    await screen.findByText(TOTAL);
    await openEditFor(user, /^6\s*Demo suelto/);
    await waitForOptions();
    await choose(user, 'Demo otro');
    // Another person deletes the parent after the options were loaded.
    modules.state.deleteModule(503);

    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(
      await screen.findByText('El módulo padre ya no existe o fue eliminado. Elige otro.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Demo suelto');
  });
});
