import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { uuidOf } from '@/test/ids';
import { renderWithProviders } from '@/test/renderWithProviders';

import { MonitoredComponentEditPage } from './MonitoredComponentEditPage';

const text = messages.health.registry;
const ID = uuidOf(300);
const DETAIL = `/api/v1/monitored-components/${ID}`;

function renderEdit() {
  return renderWithProviders(
    [
      { path: '/health/components', element: <h1>Listado</h1> },
      { path: '/health/components/:componentId', element: <h1>Detalle</h1> },
      {
        path: '/health/components/:componentId/edit',
        element: <MonitoredComponentEditPage componentId={ID} />,
      },
    ],
    { route: `/health/components/${ID}/edit` },
  );
}

const input = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const save = () => screen.getByRole('button', { name: messages.common.save });

describe('MonitoredComponentEditPage', () => {
  it('opens with the data of the component, the code and the kind fixed (FR-037)', async () => {
    createHealthMonitoringMock({ registered: [monitoredComponentDto({ id: ID })] });
    const { container } = renderEdit();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.titles.healthComponentEdit }),
    ).toHaveFocus();
    expect(await screen.findByDisplayValue('MailySoft Usuarios')).toBeInTheDocument();
    expect(input(text.fields.baseUrl)).toHaveValue('http://mailysoft-usuarios:8000');
    expect(screen.getByText(text.form.fixedInfo)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends only what changed, tells so and goes back to the detail', async () => {
    const health = createHealthMonitoringMock({
      registered: [monitoredComponentDto({ id: ID })],
    });
    const { user, router } = renderEdit();
    await screen.findByDisplayValue('MailySoft Usuarios');

    await user.clear(input(text.fields.name));
    await user.type(input(text.fields.name), 'Usuarios');
    await user.click(screen.getByRole('checkbox', { name: text.fields.enabled }));
    await user.click(save());

    expect(await screen.findByRole('heading', { level: 1, name: 'Detalle' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/health/components/${ID}`);
    expect(await screen.findByText(text.notices.updated)).toBeInTheDocument();
    expect(health.requestsTo('PATCH', DETAIL)[0]?.body).toEqual({
      name: 'Usuarios',
      enabled: false,
    });
  });

  it('asks nothing when nothing changed', async () => {
    const health = createHealthMonitoringMock({
      registered: [monitoredComponentDto({ id: ID })],
    });
    const { user } = renderEdit();
    await screen.findByDisplayValue('MailySoft Usuarios');

    await user.click(save());

    expect(await screen.findByRole('heading', { level: 1, name: 'Detalle' })).toBeInTheDocument();
    expect(health.requestsTo('PATCH', DETAIL)).toHaveLength(0);
  });

  it('says the component no longer exists and goes back to the list when another person deleted it', async () => {
    const health = createHealthMonitoringMock({
      registered: [monitoredComponentDto({ id: ID })],
    });
    const { user, router } = renderEdit();
    await screen.findByDisplayValue('MailySoft Usuarios');
    health.removeBehindTheScenes(ID);

    await user.clear(input(text.fields.name));
    await user.type(input(text.fields.name), 'Usuarios');
    await user.click(save());

    expect(await screen.findByRole('heading', { level: 1, name: 'Listado' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByText(text.errors.notFound)).toBeInTheDocument();
  });

  it('says the component no longer exists when it is opened after it was deleted', async () => {
    createHealthMonitoringMock();
    renderEdit();

    expect(await screen.findByRole('heading', { level: 1, name: 'Listado' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(text.errors.notFound)).toBeInTheDocument();
    });
  });
});
