import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { uuidOf } from '@/test/ids';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { HealthCapabilities } from '../policy/healthCapabilities';
import { MonitoredComponentsListPage } from './MonitoredComponentsListPage';

const text = messages.health.registry;
const READ_ONLY: HealthCapabilities = { canCreate: false, canEdit: false, canDelete: false };
const EVERYTHING: HealthCapabilities = { canCreate: true, canEdit: true, canDelete: true };

/** `count` registered components, in order. */
function registered(count: number) {
  return Array.from({ length: count }, (_, index) =>
    monitoredComponentDto({
      id: uuidOf(200 + index),
      code: `servicio-${String(index + 1).padStart(2, '0')}`,
      name: `Servicio ${String(index + 1).padStart(2, '0')}`,
      sort_order: index,
    }),
  );
}

function renderList(capabilities: HealthCapabilities = READ_ONLY, route = '/health/components') {
  return renderWithProviders(<MonitoredComponentsListPage capabilities={capabilities} />, {
    route,
  });
}

const grid = () => screen.getByRole('grid', { name: text.gridLabel });

describe('MonitoredComponentsListPage', () => {
  it('shows the registered components with the note of the integrated ones (FR-034, FR-043)', async () => {
    createHealthMonitoringMock({ registered: registered(3) });
    const { container } = renderList();

    expect(screen.getByRole('heading', { level: 1, name: text.title })).toHaveFocus();
    expect(await screen.findByRole('link', { name: 'Servicio 01' })).toBeInTheDocument();
    expect(screen.getByText(text.builtInNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: text.backToHealth })).toHaveAttribute(
      'href',
      '/health',
    );
    expect(screen.queryByRole('link', { name: text.create })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('cuts the list into pages of the size of the address, never more rows', async () => {
    createHealthMonitoringMock({ registered: registered(30) });
    renderList(READ_ONLY, '/health/components?page=2&pageSize=25');

    await screen.findByRole('link', { name: 'Servicio 26' });
    expect(within(grid()).getAllByRole('link')).toHaveLength(5);
    expect(screen.getByText('26–30 de 30')).toBeInTheDocument();
  });

  it('goes to the last page when the address asks for one that does not exist', async () => {
    createHealthMonitoringMock({ registered: registered(12) });
    const { router } = renderList(READ_ONLY, '/health/components?page=9');

    await screen.findByRole('link', { name: 'Servicio 11' });
    await waitFor(() => {
      expect(router.state.location.search).toBe('?page=2');
    });
  });

  it('says there is nothing registered yet, and offers «Nuevo componente» only to who may register', async () => {
    createHealthMonitoringMock();
    const { container } = renderList(EVERYTHING);

    expect(await screen.findByText(text.empty)).toBeInTheDocument();
    expect(screen.getByText(text.builtInNote)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: text.create }).length).toBeGreaterThan(0);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the failure with «Reintentar», which asks again', async () => {
    const health = createHealthMonitoringMock({ registered: registered(1) });
    health.failNext({ status: 500, code: 'internal_error' });
    const { user } = renderList();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.errors.loadError.listTitle);
    expect(alert).not.toHaveTextContent(messages.health.page.authorizationUnavailable);
    await user.click(within(alert).getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByRole('link', { name: 'Servicio 01' })).toBeInTheDocument();
  });

  it('adds the possible cause when the permission could not be checked (503)', async () => {
    const health = createHealthMonitoringMock();
    health.authorizationUnavailable();
    renderList();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      messages.health.page.authorizationUnavailable,
    );
  });

  it('says the person may not see the registry when the service refuses it (403)', async () => {
    const health = createHealthMonitoringMock();
    health.failNext({ status: 403, code: 'permission_denied' });
    renderList();

    expect(await screen.findByText(text.noPermission)).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });
});
