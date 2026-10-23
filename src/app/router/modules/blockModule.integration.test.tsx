import { configure, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { createModulesCatalogMock } from '@/test/handlers/modulesCatalog';
import { ADMIN_SUB, createUsersDirectoryMock, defaultDirectory } from '@/test/handlers/usersDirectory';
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

async function openEditFor(user: ReturnType<typeof open>['user'], rowName: RegExp) {
  const row = await screen.findByRole('row', { name: rowName });
  await user.click(within(row).getByRole('button', { name: 'Editar' }));
}

describe('the modules section: blocking and unblocking (feature 013, user story 4)', () => {
  it('blocks a module, moves it between the Activos and Bloqueados filters, and unblocks it back (W14)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    // "Inventario" does not exist yet in the seeded catalog; use a real seeded one instead
    // ("reminders"/"Recordatorios") so this test is self-contained without depending on US2.
    await openEditFor(user, /Recordatorios/);
    await user.click(screen.getByRole('button', { name: 'Bloquear módulo' }));
    await screen.findByText('Módulo bloqueado.');

    expect(screen.queryByRole('row', { name: /Recordatorios/ })).not.toBeInTheDocument();
    expect(screen.getByText('22 módulos activos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bloqueados' }));
    const blockedRow = await screen.findByRole('row', { name: /Recordatorios/ });
    expect(screen.getByText('1 módulos bloqueados')).toBeInTheDocument();

    await user.click(within(blockedRow).getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Desbloquear módulo' }));
    await screen.findByText('Módulo desbloqueado.');

    await user.click(screen.getByRole('button', { name: 'Activos' }));
    expect(await screen.findByText('23 módulos activos')).toBeInTheDocument();
    expect(await screen.findByRole('row', { name: /Recordatorios/ })).toBeInTheDocument();
  });

  it('offers no way to block one of the four base modules, with an explanation (W15)', async () => {
    start();
    const { user } = open('/modules');
    await screen.findByText('23 módulos activos');

    await openEditFor(user, /Módulos/);

    expect(screen.queryByRole('button', { name: /^(Bloquear|Desbloquear) módulo/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Los módulos base de administración (Usuarios, Roles, Permisos y Módulos) no se pueden bloquear ni eliminar.',
      ),
    ).toBeInTheDocument();
  });
});
