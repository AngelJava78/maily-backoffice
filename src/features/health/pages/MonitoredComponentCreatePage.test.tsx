import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { messages } from '@/shared/messages/es';
import { monitoredComponentDto } from '@/test/factories';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { renderWithProviders } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import { subscriptionsUrl } from '@/test/subscriptionsClient';

import { MonitoredComponentCreatePage } from './MonitoredComponentCreatePage';

const text = messages.health.registry;

function renderCreate() {
  return renderWithProviders(
    [
      { path: '/health/components', element: <h1>Listado</h1> },
      { path: '/health/components/new', element: <MonitoredComponentCreatePage /> },
    ],
    { route: '/health/components/new' },
  );
}

const input = (label: string) => screen.getByRole('textbox', { name: new RegExp(`^${label}`) });
const save = () => screen.getByRole('button', { name: messages.common.save });

/** Fills in a microservice, keeping the routes the form proposes. */
async function fillService(
  user: ReturnType<typeof renderCreate>['user'],
  code = 'mailysoft-usuarios',
) {
  await user.type(input(text.fields.name), 'MailySoft Usuarios');
  await user.type(input(text.fields.code), code);
  await user.type(input(text.fields.baseUrl), 'http://mailysoft-usuarios:8000');
}

describe('MonitoredComponentCreatePage', () => {
  it('registers a microservice with the routes it proposes, tells so and goes back to the list (FR-036)', async () => {
    const health = createHealthMonitoringMock();
    const { user, router } = renderCreate();

    expect(
      screen.getByRole('heading', { level: 1, name: messages.titles.healthComponentCreate }),
    ).toHaveFocus();
    await fillService(user);
    await user.click(save());

    expect(await screen.findByRole('heading', { level: 1, name: 'Listado' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/health/components');
    expect(await screen.findByText(text.notices.created)).toBeInTheDocument();
    expect(health.requestsTo('POST', '/api/v1/monitored-components')[0]?.body).toEqual({
      code: 'mailysoft-usuarios',
      name: 'MailySoft Usuarios',
      kind: 'service',
      base_url: 'http://mailysoft-usuarios:8000',
      live_path: '/health/live',
      ready_path: '/health/ready',
      info_path: '/info',
      enabled: true,
      sort_order: 0,
    });
  });

  it('registers a frontend without readiness route', async () => {
    const health = createHealthMonitoringMock();
    const { user } = renderCreate();

    await user.type(input(text.fields.name), 'MailySoft');
    await user.type(input(text.fields.code), 'mailysoft-web');
    await user.click(screen.getByRole('radio', { name: text.kinds.frontend }));
    await user.type(input(text.fields.baseUrl), 'https://mailysoft.example');
    await user.type(input(text.fields.healthPath), '/healthz');
    await user.click(save());

    await screen.findByRole('heading', { level: 1, name: 'Listado' });
    expect(health.requestsTo('POST', '/api/v1/monitored-components')[0]?.body).toMatchObject({
      kind: 'frontend',
      live_path: '/healthz',
      ready_path: null,
      info_path: null,
    });
  });

  it('cannot be saved again while it is saving', async () => {
    const health = createHealthMonitoringMock();
    const release = health.defer();
    const { user } = renderCreate();
    await fillService(user);

    await user.click(save());

    await waitFor(() => {
      expect(save()).toBeDisabled();
    });
    release();
    await screen.findByRole('heading', { level: 1, name: 'Listado' });
    expect(health.requestsTo('POST', '/api/v1/monitored-components')).toHaveLength(1);
  });

  it('puts a code in use next to the code (409, US3-6)', async () => {
    createHealthMonitoringMock({ registered: [monitoredComponentDto()] });
    const { user } = renderCreate();
    await fillService(user);

    await user.click(save());

    await waitFor(() => {
      expect(input(text.fields.code)).toHaveAccessibleDescription(text.errors.codeTaken);
    });
    expect(input(text.fields.code)).toHaveFocus();
  });

  it('puts a domain that is not allowed next to the base URL (422, US3-7), accessibly', async () => {
    const health = createHealthMonitoringMock();
    health.setAllowedHosts(['otro-servicio']);
    const { user, container } = renderCreate();
    await fillService(user);

    await user.click(save());

    await waitFor(() => {
      expect(input(text.fields.baseUrl)).toHaveAccessibleDescription(text.errors.hostNotAllowed);
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sends nothing while a field does not follow its format (US3-8)', async () => {
    const health = createHealthMonitoringMock();
    const { user } = renderCreate();
    await user.type(input(text.fields.code), 'Codigo Malo');

    await user.click(save());

    expect(await screen.findByText(text.form.code)).toBeInTheDocument();
    expect(health.requestsTo('POST', '/api/v1/monitored-components')).toHaveLength(0);
  });

  it('says that it could not save when the service does not answer, and keeps what was written', async () => {
    createHealthMonitoringMock();
    server.use(
      http.post(subscriptionsUrl('/api/v1/monitored-components'), () => HttpResponse.error()),
    );
    const { user } = renderCreate();
    await fillService(user);

    await user.click(save());

    expect(await screen.findByText(text.errors.unavailable)).toBeInTheDocument();
    expect(input(text.fields.name)).toHaveValue('MailySoft Usuarios');
    expect(input(text.fields.code)).toHaveValue('mailysoft-usuarios');
  });
});
