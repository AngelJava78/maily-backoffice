import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';
import { createModulesCatalogMock } from '@/test/handlers/modulesCatalog';

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

  it('shows an empty panel until a module is opened or created', async () => {
    createModulesCatalogMock();
    renderPage();

    await screen.findByText('23 módulos activos');

    expect(
      screen.getByText('Selecciona un módulo para editarlo, o crea uno nuevo.'),
    ).toBeInTheDocument();
  });

  it('opens the create panel from "+ Nuevo módulo" (US2)', async () => {
    createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');

    await userEvent.setup().click(screen.getByRole('button', { name: '+ Nuevo módulo' }));

    expect(screen.getByRole('heading', { name: 'Nuevo módulo' })).toBeInTheDocument();
  });

  it('opens the edit panel from a row\'s "Editar", with its data and no new request (US3, research D10)', async () => {
    const mock = createModulesCatalogMock();
    renderPage();
    await screen.findByText('23 módulos activos');
    const requestsBefore = mock.requestCount;

    const row = screen.getByRole('row', { name: /Agenda y citas/ });
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Editar' }));

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
