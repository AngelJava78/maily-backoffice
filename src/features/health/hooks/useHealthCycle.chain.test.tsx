import { focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import {
  createHealthMonitoringMock,
  type HealthMonitoringMock,
} from '@/test/handlers/healthMonitoring';
import { createHealthProbesMock } from '@/test/handlers/healthProbes';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { healthKeys } from './healthKeys';
import { useDirectCheckSection } from './useDirectCheckSection';
import { useHealthCycle } from './useHealthCycle';
import { usePlatformStatusSection } from './usePlatformStatusSection';

const INTERVAL_MS = 30_000;
/** The query of the aggregator and its retry, a second later (research D7). */
const RETRY_MS = 1_000;
const HEALTH_PATH = '/api/v1/health';
const PUBLIC_STATUS_PATH = '/health/status';

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function eventually(check: () => void): Promise<void> {
  await act(async () => {
    await vi.waitFor(check);
  });
}

/** The cycle of the page and its section of the public status, with the fake clock. */
function setup(health: HealthMonitoringMock = createHealthMonitoringMock()) {
  vi.useFakeTimers();
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ queryClient });
  const view = renderHook(
    () => ({
      cycle: useHealthCycle(INTERVAL_MS),
      platform: usePlatformStatusSection('page'),
      direct: useDirectCheckSection('page'),
    }),
    { wrapper },
  );
  return {
    health,
    queryClient,
    aggregator: () => health.requestsTo('GET', HEALTH_PATH).length,
    publicStatus: () => health.requestsTo('GET', PUBLIC_STATUS_PATH).length,
    ...view,
  };
}

describe('the chain of the cycle of «Salud de servicios» (user story 5)', () => {
  it('asks for the public status in the same cycle when the aggregator fails, and counts the interval from its end (FR-067, FR-071)', async () => {
    const health = createHealthMonitoringMock();
    health.authorizationUnavailable();
    const { result, aggregator, publicStatus, queryClient } = setup(health);

    await advance(RETRY_MS);
    await eventually(() => {
      expect(result.current.platform.status).toBe('ready');
    });
    expect(aggregator()).toBe(2);
    expect(publicStatus()).toBe(1);

    const endedAt =
      queryClient.getQueryState(healthKeys.platformStatus('page'))?.dataUpdatedAt ?? 0;
    await advance(endedAt + INTERVAL_MS - 1 - Date.now());
    expect(aggregator()).toBe(2);
    await advance(1);
    await eventually(() => {
      expect(aggregator()).toBe(3);
    });
  });

  it('does not ask for the public status when the aggregator answers, and takes its section away', async () => {
    const health = createHealthMonitoringMock();
    health.failNext({ status: 500, code: 'internal_error' });
    health.failNext({ status: 500, code: 'internal_error' });
    const { result, queryClient, publicStatus } = setup(health);
    await advance(RETRY_MS);
    await eventually(() => {
      expect(result.current.platform.status).toBe('ready');
    });

    act(() => {
      result.current.cycle.refresh();
    });

    await eventually(() => {
      expect(result.current.cycle.view.status).toBe('ready');
    });
    await eventually(() => {
      expect(result.current.platform.status).toBe('hidden');
    });
    expect(publicStatus()).toBe(1);
    expect(queryClient.getQueryData(healthKeys.platformStatus('page'))).toBeUndefined();
  });

  it('does not start the chain on a 403, nor on another 4xx', async () => {
    const forbidden = setup(createHealthMonitoringMock({ directory: createUsersDirectoryMock() }));
    await eventually(() => {
      expect(forbidden.result.current.cycle.view.status).toBe('forbidden');
    });
    expect(forbidden.publicStatus()).toBe(0);
    forbidden.unmount();

    const health = createHealthMonitoringMock();
    health.failNext({ status: 404, code: 'not_found' });
    const notFound = setup(health);
    await eventually(() => {
      expect(notFound.result.current.cycle.view.status).toBe('failed');
    });
    expect(notFound.publicStatus()).toBe(0);
    expect(notFound.result.current.platform.status).toBe('hidden');
  });

  it('keeps what the section showed, refreshing, while the next failing cycle asks again', async () => {
    const health = createHealthMonitoringMock();
    health.failAll(500);
    const { result } = setup(health);
    await advance(RETRY_MS);
    await eventually(() => {
      expect(result.current.platform.status).toBe('ready');
    });

    const release = health.publicStatus.defer();
    act(() => {
      result.current.cycle.refresh();
    });
    await advance(RETRY_MS);

    await eventually(() => {
      expect(result.current.platform).toMatchObject({ status: 'ready', isRefreshing: true });
    });
    release();
    await eventually(() => {
      expect(result.current.platform).toMatchObject({ status: 'ready', isRefreshing: false });
    });
  });

  it('cancels the steps on their way and takes them away when the page is left (FR-064)', async () => {
    const health = createHealthMonitoringMock();
    health.failAll(500);
    health.publicStatus.defer();
    const { queryClient, unmount } = setup(health);
    await advance(RETRY_MS);
    await eventually(() => {
      expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)).toHaveLength(1);
    });

    unmount();

    await eventually(() => {
      expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)[0]?.aborted).toBe(true);
    });
    expect(
      queryClient.getQueryCache().find({ queryKey: healthKeys.platformStatus('page') }),
    ).toBeUndefined();
  });
});

describe('the direct check in the cycle of «Salud de servicios» (user story 6)', () => {
  it('checks the services in the same cycle when the public status fails too, and counts the interval from its end', async () => {
    const health = createHealthMonitoringMock();
    health.failAll(500);
    health.publicStatus.failAll(500);
    const probes = createHealthProbesMock();
    const { result, queryClient, aggregator } = setup(health);

    await advance(RETRY_MS);
    await advance(RETRY_MS);
    await eventually(() => {
      expect(result.current.direct.status).toBe('ready');
    });
    // The two services of the platform, both routes; no service is configured in this harness.
    expect(probes.allRequests()).toHaveLength(4);
    expect(result.current.platform.status).toBe('failed');

    const endedAt = queryClient.getQueryState(healthKeys.directCheck('page'))?.dataUpdatedAt ?? 0;
    await advance(endedAt + INTERVAL_MS - 1 - Date.now());
    expect(aggregator()).toBe(2);
    await advance(1);
    await eventually(() => {
      expect(aggregator()).toBe(3);
    });
  });

  it('keeps the rows, refreshing, while the next round is on its way, and never two at once', async () => {
    const health = createHealthMonitoringMock();
    health.failAll(500);
    health.publicStatus.failAll(500);
    const probes = createHealthProbesMock();
    const { result } = setup(health);
    await advance(2 * RETRY_MS);
    await eventually(() => {
      expect(result.current.direct.status).toBe('ready');
    });

    const release = probes.defer();
    act(() => {
      result.current.cycle.refresh();
      result.current.cycle.refresh();
    });
    await advance(2 * RETRY_MS);
    await eventually(() => {
      expect(result.current.direct).toMatchObject({ status: 'ready', isRefreshing: true });
    });
    expect(probes.allRequests()).toHaveLength(8);
    release();
    await eventually(() => {
      expect(result.current.direct).toMatchObject({ status: 'ready', isRefreshing: false });
    });
  });

  it('takes the direct check away when the public status or the aggregator answer again', async () => {
    const health = createHealthMonitoringMock();
    health.failAll(500);
    health.publicStatus.failAll(500);
    createHealthProbesMock();
    const { result } = setup(health);
    await advance(2 * RETRY_MS);
    await eventually(() => {
      expect(result.current.direct.status).toBe('ready');
    });

    health.publicStatus.recover();
    act(() => {
      result.current.cycle.refresh();
    });
    await advance(RETRY_MS);
    await eventually(() => {
      expect(result.current.platform.status).toBe('ready');
    });
    await eventually(() => {
      expect(result.current.direct.status).toBe('hidden');
    });
  });
});
