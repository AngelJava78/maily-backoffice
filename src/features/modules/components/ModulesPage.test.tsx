import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { catalogModule, createModulesCatalogMock } from '@/test/handlers/modulesCatalog';

import { ModulesPage } from './ModulesPage';

const FULL_ACCESS = {
  canCreate: true,
  canEdit: true,
  canBlock: true,
  canUnblock: true,
  canDelete: true,
};

function renderPage() {
  return renderWithProviders(<ModulesPage capabilities={FULL_ACCESS} />, { route: '/modules' });
}

describe('ModulesPage', () => {
  it('shows the two sections with the full catalog and its count', async () => {
    createModulesCatalogMock();
    renderPage();

    expect(await screen.findByText('23 módulos activos')).toBeInTheDocument();
    expect(screen.getByText('Sistema, pantallas del Backoffice · 8 módulos')).toBeInTheDocument();
    expect(screen.getByText('Clínica, aplicación para clínicas · 15 módulos')).toBeInTheDocument();
  });

  it('filtering by Tipo = Sistema shows only that section and makes no new request', async () => {
    const mock = createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');
    const requestsBefore = mock.requestCount;

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sistema' }));

    expect(screen.getByText(/Sistema, pantallas del Backoffice/)).toBeInTheDocument();
    expect(screen.queryByText(/Clínica, aplicación para clínicas/)).not.toBeInTheDocument();
    expect(mock.requestCount).toBe(requestsBefore);
  });

  it('filtering by Estatus = Bloqueados makes a new request with status_id=2', async () => {
    const mock = createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Bloqueados' }));

    await waitFor(() => {
      expect(
        mock
          .requestsTo('GET', '/api/v1/modules')
          .some((request) => request.search === '?status_id=2'),
      ).toBe(true);
    });
    expect(await screen.findByText('No hay módulos bloqueados.')).toBeInTheDocument();
  });

  it('searching narrows the list to the matching module', async () => {
    createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');

    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'agenda');

    expect(await screen.findByRole('row', { name: /Agenda y citas/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /^Usuarios/ })).not.toBeInTheDocument();
  });

  it('shows a dedicated empty state for a search without matches', async () => {
    createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');

    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'zzz');

    expect(await screen.findByText('Ningún módulo coincide con la búsqueda.')).toBeInTheDocument();
  });

  it('shows an error state with retry when the load fails', async () => {
    const mock = createModulesCatalogMock();
    mock.failAll(500);
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    mock.recover();
    await userEvent.setup().click(retry);

    expect(await screen.findByText('23 módulos activos')).toBeInTheDocument();
  });

  it('has no axe violations once loaded', async () => {
    createModulesCatalogMock();
    const { container } = renderPage();

    await screen.findByText('23 módulos activos');

    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows no modal and no leftover panel text until a module is opened or created (FR-003)', async () => {
    createModulesCatalogMock();
    renderPage();

    await screen.findByText('23 módulos activos');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Selecciona un módulo para editarlo, o crea uno nuevo.'),
    ).not.toBeInTheDocument();
  });

  it('opens the create panel from "+ Nuevo módulo" (US2)', async () => {
    createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');

    await userEvent.setup().click(screen.getByRole('button', { name: '+ Nuevo módulo' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo módulo' })).toBeInTheDocument();
  });

  it('opens the edit panel from a row\'s "Editar", with its data and no new request (US3, research D10)', async () => {
    const mock = createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');
    const requestsBefore = mock.requestCount;

    const row = screen.getByRole('row', { name: /Agenda y citas/ });
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Editar' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Editar módulo' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Agenda y citas');
    expect(mock.requestCount).toBe(requestsBefore);
  });

  it('hides "+ Nuevo módulo" without canCreate', async () => {
    createModulesCatalogMock();
    renderWithProviders(<ModulesPage capabilities={{ ...FULL_ACCESS, canCreate: false }} />, {
      route: '/modules',
    });
    await screen.findByText('23 módulos activos');

    expect(screen.queryByRole('button', { name: '+ Nuevo módulo' })).not.toBeInTheDocument();
  });
});

describe('ModulesPage as a tree (spec 024)', () => {
  /** The real 23-module catalog plus a parent with two submodules. */
  function withHierarchy() {
    const mock = createModulesCatalogMock();
    mock.addModule(
      catalogModule({ id: 500, key: 'demo_parent', name: 'Demo padre', sortOrder: 5 }),
    );
    mock.addModule(
      catalogModule({
        id: 501,
        key: 'demo_child_a',
        name: 'Demo hija A',
        sortOrder: 10,
        parentModuleId: 500,
      }),
    );
    mock.addModule(
      catalogModule({
        id: 502,
        key: 'demo_child_b',
        name: 'Demo hija B',
        sortOrder: 20,
        parentModuleId: 500,
      }),
    );
    return mock;
  }
  const TOTAL = '24 módulos y 2 submódulos activos';

  it('tells the modules and the submodules apart in the count of the list and in its group', async () => {
    withHierarchy();
    renderPage();

    expect(await screen.findByText(TOTAL)).toBeInTheDocument();
    expect(
      screen.getByText('Clínica, aplicación para clínicas · 16 módulos y 2 submódulos'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sistema, pantallas del Backoffice · 8 módulos')).toBeInTheDocument();
  });

  it('puts the submodules right under their parent, one level in', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);

    const rows = screen.getAllByRole('row').map((row) => row.textContent);
    const parentAt = rows.findIndex((text) => text.includes('Demo padre'));
    expect(rows[parentAt + 1]).toContain('Submódulo de Demo padre');
    expect(rows[parentAt + 1]).toContain('Demo hija A');
    expect(rows[parentAt + 2]).toContain('Demo hija B');
  });

  it('collapses and expands a parent from the keyboard, starting expanded', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);
    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: '2 submódulos de Demo padre' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    toggle.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('row', { name: /Demo hija A/ })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();

    await user.keyboard(' ');
    expect(await screen.findByRole('row', { name: /Demo hija A/ })).toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it('shows the parent as context when a search only matches a submodule, and has no collapse control then', async () => {
    withHierarchy();
    renderPage();
    await screen.findByText(TOTAL);

    await userEvent
      .setup()
      .type(screen.getByRole('textbox', { name: 'Nombre o clave' }), 'child_b');

    expect(await screen.findByRole('row', { name: /Demo hija B/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Demo hija A/ })).not.toBeInTheDocument();
    expect(screen.getByText('Su submódulo coincide con la búsqueda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submódulos de/ })).not.toBeInTheDocument();
  });

  it('shows a Blocked submodule under a context row of its Active parent in the Bloqueados view', async () => {
    const mock = withHierarchy();
    mock.state.blockModule(501);
    renderPage();
    await screen.findByText('24 módulos y 1 submódulo activo');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Bloqueados' }));

    expect(await screen.findByRole('row', { name: /Demo hija A/ })).toBeInTheDocument();
    expect(screen.getByText('Está en «Activos»')).toBeInTheDocument();
    expect(screen.getByText('0 módulos y 1 submódulo bloqueado')).toBeInTheDocument();
  });

  it('has no axe violations with the tree expanded, and with a context row', async () => {
    const mock = withHierarchy();
    mock.state.blockModule(501);
    const { container } = renderPage();
    await screen.findByText('24 módulos y 1 submódulo activo');
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Bloqueados' }));
    await screen.findByText('Está en «Activos»');

    expect(await axe(container)).toHaveNoViolations();
  });
});
