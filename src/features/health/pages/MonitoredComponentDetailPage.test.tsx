import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { formatDateTime } from '@/shared/lib/formatDateTime';
import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { uuidOf } from '@/test/ids';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { HealthCapabilities } from '../policy/healthCapabilities';
import { MonitoredComponentDetailPage } from './MonitoredComponentDetailPage';

const text = messages.health.registry;
const ID = uuidOf(300);
const READ_ONLY: HealthCapabilities = { canCreate: false, canEdit: false, canDelete: false };
const EVERYTHING: HealthCapabilities = { canCreate: true, canEdit: true, canDelete: true };

/** The detail between the list, where a component that is gone takes the person, and the edition. */
function renderDetail(capabilities: HealthCapabilities = READ_ONLY) {
  return renderWithProviders(
    [
      { path: '/health/components', element: <h1>Listado</h1> },
      {
        path: '/health/components/:componentId',
        element: <MonitoredComponentDetailPage componentId={ID} capabilities={capabilities} />,
      },
      { path: '/health/components/:componentId/edit', element: <h1>Edición</h1> },
    ],
    { route: `/health/components/${ID}` },
  );
}

function valueOf(label: string): HTMLElement {
  const value = screen.getByText(label, { selector: 'dt' }).nextElementSibling;
  if (!(value instanceof HTMLElement)) {
    throw new Error(`Expected a value for ${label}`);
  }
  return value;
}

describe('MonitoredComponentDetailPage', () => {
  it('shows every datum of a microservice, the base URL as a text (FR-035, FR-007)', async () => {
    createHealthMonitoringMock({ registered: [monitoredComponentDto({ id: ID })] });
    const { container } = renderDetail();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.titles.healthComponentDetail }),
    ).toHaveFocus();
    expect(await screen.findByText('MailySoft Usuarios', { selector: 'dd' })).toBeInTheDocument();
    expect(valueOf(text.fields.code)).toHaveTextContent('mailysoft-usuarios');
    expect(valueOf(text.fields.kind)).toHaveTextContent('Microservicio');
    expect(valueOf(text.fields.baseUrl)).toHaveTextContent('http://mailysoft-usuarios:8000');
    expect(within(valueOf(text.fields.baseUrl)).queryByRole('link')).not.toBeInTheDocument();
    expect(valueOf(text.fields.livePath)).toHaveTextContent('/health/live');
    expect(valueOf(text.fields.readyPath)).toHaveTextContent('/health/ready');
    expect(valueOf(text.fields.infoPath)).toHaveTextContent('/info');
    expect(valueOf(text.fields.enabled)).toHaveTextContent(text.enabled);
    expect(valueOf(text.fields.createdAt)).toHaveTextContent(
      formatDateTime('2026-10-24T17:00:00Z'),
    );
    expect(screen.queryByRole('link', { name: text.edit })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: text.delete })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows the health route of a frontend, without readiness', async () => {
    createHealthMonitoringMock({
      registered: [
        monitoredComponentDto({ id: ID, kind: 'frontend', ready_path: null, info_path: null }),
      ],
    });
    renderDetail();

    expect(await screen.findByText(text.fields.healthPath, { selector: 'dt' })).toBeInTheDocument();
    expect(screen.queryByText(text.fields.readyPath, { selector: 'dt' })).not.toBeInTheDocument();
    expect(valueOf(text.fields.infoPath)).toHaveTextContent(messages.health.notAvailable);
  });

  it('offers the actions that the capabilities allow', async () => {
    createHealthMonitoringMock({ registered: [monitoredComponentDto({ id: ID })] });
    renderDetail(EVERYTHING);

    expect(await screen.findByRole('link', { name: text.edit })).toHaveAttribute(
      'href',
      `/health/components/${ID}/edit`,
    );
    expect(screen.getByRole('button', { name: text.delete })).toBeInTheDocument();
  });

  it('shows the failure with «Reintentar», which asks again', async () => {
    const health = createHealthMonitoringMock({ registered: [monitoredComponentDto({ id: ID })] });
    health.failNext({ status: 500, code: 'internal_error' });
    const { user } = renderDetail();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(text.errors.loadError.detailTitle);
    await user.click(within(alert).getByRole('button', { name: messages.common.retry }));

    expect(await screen.findByText('MailySoft Usuarios', { selector: 'dd' })).toBeInTheDocument();
  });

  it('says the component no longer exists and goes back to the list (404, FR-039)', async () => {
    createHealthMonitoringMock();
    const { router } = renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Listado' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
  });

  it('asks before deleting, and changes nothing when the person cancels (FR-040)', async () => {
    const health = createHealthMonitoringMock({ registered: [monitoredComponentDto({ id: ID })] });
    const { user } = renderDetail(EVERYTHING);
    const remove = await screen.findByRole('button', { name: text.delete });

    await user.click(remove);
    const dialog = await screen.findByRole('dialog', {
      name: text.deleteDialog.title('MailySoft Usuarios'),
    });
    expect(dialog).toHaveTextContent(text.deleteDialog.message);
    expect(await axe(document.body)).toHaveNoViolations();
    await user.click(within(dialog).getByRole('button', { name: text.deleteDialog.cancel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(remove).toHaveFocus();
    expect(health.requestsTo('DELETE', /monitored-components/)).toHaveLength(0);
  });

  it('deletes the component when the person confirms, with a notice, and goes back to the list', async () => {
    const health = createHealthMonitoringMock({ registered: [monitoredComponentDto({ id: ID })] });
    const { user, router } = renderDetail(EVERYTHING);

    await user.click(await screen.findByRole('button', { name: text.delete }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: text.deleteDialog.confirm }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Listado' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByText(text.notices.deleted)).toBeInTheDocument();
    expect(health.registered()).toEqual([]);
  });
});
