import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import type { HttpClients } from '@/shared/api/httpClientsContext';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createHealthProbesMock } from '@/test/handlers/healthProbes';
import { createSubscriptionsClient } from '@/test/subscriptionsClient';
import { createUsersClient } from '@/test/usersClient';

import { forgetFallbackSteps, runFallbackChain } from './fallbackChain';
import { healthKeys } from './healthKeys';

const PUBLIC_STATUS_PATH = '/health/status';

afterEach(() => {
  vi.useRealTimers();
});

/** The clients of the application, with the token of the tests. */
function clients(): HttpClients {
  return {
    users: createUsersClient().client,
    subscriptions: createSubscriptionsClient().client,
    healthServices: [],
  };
}

function context(signal = new AbortController().signal) {
  const queryClient = createQueryClient();
  return { queryClient, clients: clients(), scope: 'page' as const, signal };
}

describe('runFallbackChain', () => {
  it('asks for the public status and takes the direct check away when it answers (FR-067, FR-070)', async () => {
    const health = createHealthMonitoringMock();
    const chain = context();
    chain.queryClient.setQueryData(healthKeys.directCheck('page'), []);

    await runFallbackChain(chain);

    expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)).toHaveLength(1);
    expect(chain.queryClient.getQueryData(healthKeys.platformStatus('page'))).toMatchObject({
      status: 'ok',
      components: [{ code: 'maily-system-api' }, { code: 'database' }],
    });
    expect(
      chain.queryClient.getQueryCache().find({ queryKey: healthKeys.directCheck('page') }),
    ).toBeUndefined();
  });

  it('keeps a failure as the state of its step, after one retry, never rejects and goes on to the direct check', async () => {
    const health = createHealthMonitoringMock();
    health.publicStatus.failAll(500);
    const probes = createHealthProbesMock();
    const chain = context();

    // The retry waits a second of the real clock.
    await expect(runFallbackChain(chain)).resolves.toBeUndefined();

    expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)).toHaveLength(2);
    expect(chain.queryClient.getQueryState(healthKeys.platformStatus('page'))?.status).toBe(
      'error',
    );
    // The public status failed too: the browser checks the two services by itself.
    expect(probes.allRequests()).toHaveLength(4);
    expect(chain.queryClient.getQueryData(healthKeys.directCheck('page'))).toMatchObject([
      { code: 'maily-system-api', status: 'operational' },
      { code: 'mailysoft-usuarios', status: 'operational' },
    ]);
  });

  it('keeps the steps of each screen apart', async () => {
    createHealthMonitoringMock();
    const chain = context();

    await runFallbackChain({ ...chain, scope: 'access' });

    expect(chain.queryClient.getQueryData(healthKeys.platformStatus('access'))).toBeDefined();
    expect(chain.queryClient.getQueryData(healthKeys.platformStatus('page'))).toBeUndefined();
  });

  it('cancels the step on its way when its signal aborts', async () => {
    const health = createHealthMonitoringMock();
    health.publicStatus.defer();
    const controller = new AbortController();
    const chain = context(controller.signal);

    const done = runFallbackChain(chain);
    await vi.waitFor(() => {
      expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)).toHaveLength(1);
    });
    controller.abort();

    await expect(done).resolves.toBeUndefined();
    await vi.waitFor(() => {
      expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)[0]?.aborted).toBe(true);
    });
  });
});

describe('forgetFallbackSteps', () => {
  it('takes away the sections of a screen, and only those', () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(healthKeys.platformStatus('page'), { status: 'ok' });
    queryClient.setQueryData(healthKeys.directCheck('page'), []);
    queryClient.setQueryData(healthKeys.platformStatus('access'), { status: 'ok' });

    forgetFallbackSteps(queryClient, 'page');

    expect(
      queryClient.getQueryCache().findAll({ queryKey: ['health', 'platform-status', 'page'] }),
    ).toEqual([]);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ['health', 'direct-check', 'page'] }),
    ).toEqual([]);
    expect(queryClient.getQueryData(healthKeys.platformStatus('access'))).toEqual({ status: 'ok' });
  });
});
