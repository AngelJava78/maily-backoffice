import { configure, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, describe, expect, it } from 'vitest';

import { messages } from '@/shared/messages/es';
import { watchFetchCalls } from '@/test/fetchCalls';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createHealthProbesMock, PATIENTS_BASE_URL } from '@/test/handlers/healthProbes';
import { SUBSCRIPTIONS_API_BASE_URL } from '@/test/handlers/subscriptionsCatalog/baseUrl';
import { ADMIN_SUB, createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { renderApp, type RenderAppOptions } from '@/test/renderApp';
import { server } from '@/test/server';

beforeAll(async () => {
  configure({ asyncUtilTimeout: 10_000 });
  await Promise.all([
    import('@/features/health'),
    import('@/features/health/pages/HealthPage'),
    import('@/features/health/components/AccessCheckFallback'),
    import('@/features/home'),
  ]);
}, 90_000);

const text = messages.health;
const PATIENTS = {
  code: 'mailysoft-pacientes',
  name: 'mailySoft-pacientes',
  url: PATIENTS_BASE_URL,
};

/** maily-system-api does not answer at all: its aggregator and its public status fail. */
function systemApiStopped(): void {
  server.use(
    http.get(`${SUBSCRIPTIONS_API_BASE_URL}/api/v1/health`, () => HttpResponse.error()),
    http.get(`${SUBSCRIPTIONS_API_BASE_URL}/health/status`, () => HttpResponse.error()),
  );
}

function start() {
  const directory = createUsersDirectoryMock();
  directory.grant('Administrator', 'health:read');
  const health = createHealthMonitoringMock({ directory });
  const probes = createHealthProbesMock();
  return { directory, health, probes };
}

function open(url: string, options: RenderAppOptions = {}) {
  return renderApp({
    url,
    sub: ADMIN_SUB,
    signedIn: true,
    env: { VITE_HEALTH_DIRECT_SERVICES: [PATIENTS] },
    ...options,
  });
}

const section = () => screen.findByRole('region', { name: text.direct.title });

/** The rows of the direct check, as `name status`. */
async function rows(): Promise<string[]> {
  const region = await section();
  await within(region).findByText(text.direct.intro);
  return within(region)
    .getAllByRole('listitem')
    .map((row) => row.textContent);
}

describe('«Comprobación directa» (user story 6)', { timeout: 30_000 }, () => {
  it('says what the browser could check when maily-system-api does not answer (US6-1, SC-019)', async () => {
    const { probes } = start();
    probes.setMode(SUBSCRIPTIONS_API_BASE_URL, 'networkError');
    systemApiStopped();
    open('/health');

    expect(await screen.findByText(text.page.loadError.title)).toBeInTheDocument();
    expect(await screen.findByText(text.platform.failed)).toBeInTheDocument();
    expect(await rows()).toEqual([
      'maily-system-apiNo responde',
      'mailySoft-usuariosOperativo',
      'mailySoft-pacientesOperativo',
    ]);
    expect(screen.getByText(text.direct.others)).toBeInTheDocument();
  });

  it('shows it on the failure screen too, which stays as it is (US6-2, SC-020)', async () => {
    const { probes } = start();
    probes.setMode(SUBSCRIPTIONS_API_BASE_URL, 'networkError');
    probes.setMode(USERS_API_BASE_URL, 'networkError');
    systemApiStopped();
    server.use(
      http.get(`${USERS_API_BASE_URL}/api/v1/authorization/me`, () => HttpResponse.error()),
    );
    open('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: messages.checkFailed.title }),
    ).toBeInTheDocument();
    expect(await rows()).toEqual([
      'maily-system-apiNo responde',
      'mailySoft-usuariosNo responde',
      'mailySoft-pacientesOperativo',
    ]);
    expect(screen.getByRole('button', { name: messages.common.retry })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.logout })).toBeInTheDocument();
  });

  it('asks nothing of the services when the public status answers (US6-3)', async () => {
    const { health, probes } = start();
    health.failAll(503, 'authorization_unavailable');
    open('/health');

    expect(await screen.findByText('Todo operativo')).toBeInTheDocument();
    expect(probes.allRequests()).toHaveLength(0);
    expect(screen.queryByRole('region', { name: text.direct.title })).not.toBeInTheDocument();
  });

  it('asks without the token and without cookies (US6-12)', async () => {
    const { probes } = start();
    systemApiStopped();
    const calls = watchFetchCalls();
    open('/health');

    await rows();

    expect(probes.allRequests()).toHaveLength(6);
    expect(probes.allRequests().every((request) => request.authorization === null)).toBe(true);
    const probeCalls = calls().filter((call) => /\/health\/(live|ready)$/.test(call.url));
    expect(new Set(probeCalls.map((call) => call.credentials))).toEqual(new Set(['omit']));
  });

  it('checks only the two services of the platform without the variable (US6-13)', async () => {
    const { probes } = start();
    systemApiStopped();
    open('/health', { env: { VITE_HEALTH_DIRECT_SERVICES: [] } });

    expect(await rows()).toHaveLength(2);
    expect(probes.requestsOf(PATIENTS_BASE_URL)).toHaveLength(0);
  });

  it('takes both sections and the notice away when the aggregator answers again (US6-10)', async () => {
    // After the simulators, so that it answers first.
    start();
    systemApiStopped();
    const { user } = open('/health');
    await rows();
    server.resetHandlers();
    start();

    await user.click(screen.getByRole('button', { name: messages.common.retry }));

    expect(
      await screen.findByRole('heading', { level: 2, name: text.page.componentsTitle }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: text.direct.title })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('region', { name: text.platform.title })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
