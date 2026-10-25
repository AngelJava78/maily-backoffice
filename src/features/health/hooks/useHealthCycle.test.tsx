import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { ApiError } from '@/shared/api/ApiError';
import { healthResultDto } from '@/test/factories';
import {
  createHealthMonitoringMock,
  type HealthMonitoringMock,
} from '@/test/handlers/healthMonitoring';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import { subscriptionsUrl } from '@/test/subscriptionsClient';

import { HEALTH_RESULT_PATH } from '../api/healthApi';
import { healthResultSchema } from '../schemas/healthResult';
import { healthKeys } from './healthKeys';
import { toHealthPageView, useHealthCycle, type HealthPageView } from './useHealthCycle';

const REFRESH_MS = 30_000;
const RESULT = healthResultSchema.parse(healthResultDto());
const UPDATED_AT = 1_793_440_800_000;

/** Mounts the hook with the query client of the application: its retries and its notice of 403. */
function setup({
  health = createHealthMonitoringMock(),
  onForbidden,
}: {
  readonly health?: HealthMonitoringMock;
  readonly onForbidden?: (error: ApiError) => void;
} = {}) {
  const queryClient = createQueryClient({ onForbidden });
  const { wrapper } = createWrapper({ queryClient });
  const mount = () => renderHook(() => useHealthCycle(REFRESH_MS), { wrapper });
  return { health, queryClient, mount, ...mount() };
}

async function untilStatus(
  result: { readonly current: { readonly view: HealthPageView } },
  status: HealthPageView['status'],
): Promise<void> {
  await waitFor(() => {
    expect(result.current.view.status).toBe(status);
  });
}

/** A few real turns of the event loop, to see that nothing else was asked for. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}

describe('useHealthCycle', () => {
  it('asks the aggregator once when it mounts, and is loading until the result arrives', async () => {
    const { health, result } = setup();

    expect(result.current.view).toEqual({ status: 'loading' });
    await untilStatus(result, 'ready');

    expect(health.requests).toHaveLength(1);
    const { view } = result.current;
    if (view.status !== 'ready') {
      throw new Error('Expected the result to be ready');
    }
    expect(view).toEqual({
      status: 'ready',
      result: RESULT,
      updatedAt: view.updatedAt,
      isUpdating: false,
      refreshFailed: false,
      authorizationUnavailable: false,
    });
    expect(view.updatedAt).toBeGreaterThan(0);
  });

  it('asks again every time it mounts (FR-022)', async () => {
    const { health, result, unmount, mount } = setup();
    await untilStatus(result, 'ready');

    unmount();
    const again = mount();

    await waitFor(() => {
      expect(health.requests).toHaveLength(2);
    });
    await untilStatus(again.result, 'ready');
  });

  it('is forbidden on a 403, without the global notice and without asking again (FR-031)', async () => {
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const { health, result } = setup({
      health: createHealthMonitoringMock({ directory: createUsersDirectoryMock() }),
      onForbidden,
    });

    await untilStatus(result, 'forbidden');
    await settle();

    expect(result.current.view).toEqual({ status: 'forbidden' });
    expect(onForbidden).not.toHaveBeenCalled();
    expect(health.requests).toHaveLength(1);
  });

  it('has failed after one retry when the permission could not be checked (503), and says why', async () => {
    const health = createHealthMonitoringMock();
    health.authorizationUnavailable();
    const { result } = setup({ health });

    await untilStatus(result, 'failed');

    expect(result.current.view).toEqual({ status: 'failed', authorizationUnavailable: true });
    expect(health.requestsTo('GET', HEALTH_RESULT_PATH)).toHaveLength(2);
  });

  it('has failed without a retry when the answer breaks the contract', async () => {
    const health = createHealthMonitoringMock();
    let requests = 0;
    // Added after the simulator, so it answers first.
    server.use(
      http.get(subscriptionsUrl(HEALTH_RESULT_PATH), () => {
        requests += 1;
        return HttpResponse.json({});
      }),
    );
    const { result } = setup({ health });

    await untilStatus(result, 'failed');
    await settle();

    expect(result.current.view).toEqual({ status: 'failed', authorizationUnavailable: false });
    expect(requests).toBe(1);
  });

  it('asks again when the person asks for it', async () => {
    const { health, result } = setup();
    await untilStatus(result, 'ready');

    result.current.refresh();

    await waitFor(() => {
      expect(health.requests).toHaveLength(2);
    });
  });

  it('keeps the result for the whole session, under its own key', async () => {
    const { result, queryClient } = setup();
    await untilStatus(result, 'ready');

    expect(queryClient.getQueryData(healthKeys.result())).toEqual({
      kind: 'result',
      result: RESULT,
    });
    expect(queryClient.getQueryCache().find({ queryKey: healthKeys.result() })?.gcTime).toBe(
      Infinity,
    );
  });
});

describe('toHealthPageView', () => {
  const failure = ApiError.network();
  const unavailable = ApiError.fromResponse(503, {
    code: 'authorization_unavailable',
    message: 'No se pudo verificar su permiso.',
  });
  const idle = { isFetching: false };
  const fetching = { isFetching: true };
  const noResult = {
    data: undefined,
    error: null,
    isError: false,
    isFetching: false,
    dataUpdatedAt: 0,
  };
  const forbidden = {
    ...noResult,
    data: { kind: 'forbidden' },
    dataUpdatedAt: UPDATED_AT,
  } as const;

  it('is loading while there is no result yet', () => {
    expect(toHealthPageView({ ...noResult, isFetching: true }, fetching)).toEqual({
      status: 'loading',
    });
    expect(toHealthPageView(noResult, fetching)).toEqual({ status: 'loading' });
    expect(toHealthPageView(noResult, idle)).toEqual({ status: 'loading' });
  });

  it('has failed when there is no result and the last query failed', () => {
    expect(toHealthPageView({ ...noResult, error: failure, isError: true }, idle)).toEqual({
      status: 'failed',
      authorizationUnavailable: false,
    });
    expect(toHealthPageView({ ...noResult, error: unavailable, isError: true }, idle)).toEqual({
      status: 'failed',
      authorizationUnavailable: true,
    });
  });

  it('is forbidden when the service refused the permission and nothing is being asked for', () => {
    expect(toHealthPageView(forbidden, idle)).toEqual({ status: 'forbidden' });
  });

  it('is loading, not forbidden, while the permission is asked for again (data-model §10)', () => {
    expect(toHealthPageView(forbidden, fetching)).toEqual({ status: 'loading' });
    expect(toHealthPageView({ ...forbidden, isFetching: true }, idle)).toEqual({
      status: 'loading',
    });
  });

  it('has failed, not forbidden, when the query that asked again failed', () => {
    expect(toHealthPageView({ ...forbidden, error: unavailable, isError: true }, idle)).toEqual({
      status: 'failed',
      authorizationUnavailable: true,
    });
  });

  it('is ready with the result, updated when it arrived', () => {
    expect(
      toHealthPageView(
        {
          data: { kind: 'result', result: RESULT },
          error: null,
          isError: false,
          isFetching: false,
          dataUpdatedAt: UPDATED_AT,
        },
        idle,
      ),
    ).toEqual({
      status: 'ready',
      result: RESULT,
      updatedAt: UPDATED_AT,
      isUpdating: false,
      refreshFailed: false,
      authorizationUnavailable: false,
    });
  });

  it('keeps the result when the last query failed, and says so with its cause', () => {
    expect(
      toHealthPageView(
        {
          data: { kind: 'result', result: RESULT },
          error: unavailable,
          isError: true,
          isFetching: true,
          dataUpdatedAt: UPDATED_AT,
        },
        fetching,
      ),
    ).toEqual({
      status: 'ready',
      result: RESULT,
      updatedAt: UPDATED_AT,
      isUpdating: true,
      refreshFailed: true,
      authorizationUnavailable: true,
    });
  });
});
