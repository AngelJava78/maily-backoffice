import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, SessionExpiredError } from '@/shared/api/ApiError';
import { createHttpClient } from '@/shared/api/httpClient';
import { healthResultDto } from '@/test/factories';
import { watchFetchCalls } from '@/test/fetchCalls';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { server } from '@/test/server';
import { createSubscriptionsClient, subscriptionsUrl } from '@/test/subscriptionsClient';

import { SUBSCRIPTIONS_API_BASE_URL } from '@/test/handlers/subscriptionsCatalog/baseUrl';

import {
  AGGREGATOR_TIMEOUT_MS,
  getHealthResult,
  getPublicStatus,
  HEALTH_RESULT_PATH,
  PUBLIC_STATUS_PATH,
  PUBLIC_STATUS_TIMEOUT_MS,
} from './healthApi';

afterEach(() => {
  vi.useRealTimers();
});

describe('getHealthResult', () => {
  it('asks the aggregator of maily-system-api with the token and gives the result in camelCase', async () => {
    const health = createHealthMonitoringMock();
    const { client, authorization } = createSubscriptionsClient();

    const result = await getHealthResult(client);

    expect(HEALTH_RESULT_PATH).toBe('/api/v1/health');
    expect(health.requestsTo('GET', HEALTH_RESULT_PATH)).toEqual([
      expect.objectContaining({ search: '', authorization }),
    ]);
    expect(authorization).toBe('Bearer test-token:auth0|admin');
    expect(result).toMatchObject({
      status: 'ok',
      registryAvailable: true,
      components: [
        { code: 'maily-system-api', kind: 'service', status: 'up', latencyMs: 12 },
        { code: 'database', kind: 'database', status: 'up', version: null },
      ],
    });
  });

  it('reports an answer that does not match the contract as a contract failure', async () => {
    const withoutComponents = Object.fromEntries(
      Object.entries(healthResultDto()).filter(([key]) => key !== 'components'),
    );
    server.use(
      http.get(subscriptionsUrl(HEALTH_RESULT_PATH), () => HttpResponse.json(withoutComponents)),
    );
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getHealthResult(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('passes a 403 on as it comes: the page decides what it means (research D8)', async () => {
    createHealthMonitoringMock({ directory: createUsersDirectoryMock() });
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getHealthResult(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 403, code: 'permission_denied' });
  });

  it('passes a 503 on as it comes, when the permission could not be checked', async () => {
    const health = createHealthMonitoringMock();
    health.authorizationUnavailable();
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getHealthResult(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 503, code: 'authorization_unavailable' });
  });

  it('gives up after 15 s, not after the 30 s of the client (research D7)', async () => {
    const health = createHealthMonitoringMock();
    health.hang();
    vi.useFakeTimers();
    const { client } = createSubscriptionsClient();
    const outcome = getHealthResult(client).catch((error: unknown) => error);
    let settled = false;
    void outcome.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(AGGREGATOR_TIMEOUT_MS - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(AGGREGATOR_TIMEOUT_MS).toBe(15_000);
    expect(await outcome).toMatchObject({ kind: 'timeout' });
  });

  it('can be cancelled with the signal it receives, which the service sees as aborted', async () => {
    const health = createHealthMonitoringMock();
    health.defer();
    const { client } = createSubscriptionsClient();
    const controller = new AbortController();
    const assertion = expect(
      getHealthResult(client, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => {
      expect(health.requests).toHaveLength(1);
    });

    controller.abort();

    await assertion;
    await vi.waitFor(() => {
      expect(health.requests[0]?.aborted).toBe(true);
    });
  });
});

describe('getPublicStatus', () => {
  /** A client of maily-system-api whose token cannot be obtained, watched. */
  function clientWithoutToken() {
    const getAccessToken = vi.fn(() => Promise.reject(new SessionExpiredError()));
    const onSessionExpired = vi.fn<() => void>();
    const client = createHttpClient({
      baseUrl: SUBSCRIPTIONS_API_BASE_URL,
      getAccessToken,
      onSessionExpired,
    });
    return { client, getAccessToken, onSessionExpired };
  }

  it('asks for the public status at the root of the service, without the token nor cookies (FR-056)', async () => {
    const health = createHealthMonitoringMock();
    const calls = watchFetchCalls();
    const { client, getAccessToken } = clientWithoutToken();

    const status = await getPublicStatus(client);

    expect(PUBLIC_STATUS_PATH).toBe('/health/status');
    expect(health.requestsTo('GET', PUBLIC_STATUS_PATH)).toEqual([
      expect.objectContaining({ authorization: null }),
    ]);
    expect(calls().map((call) => call.credentials)).toEqual(['omit']);
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(status).toMatchObject({
      status: 'ok',
      components: [{ code: 'maily-system-api' }, { code: 'database' }],
    });
  });

  it('never ends the session on a 401', async () => {
    server.use(
      http.get(subscriptionsUrl(PUBLIC_STATUS_PATH), () =>
        HttpResponse.json({ code: 'invalid_token', message: 'x' }, { status: 401 }),
      ),
    );
    const { client, onSessionExpired } = clientWithoutToken();

    const failure: unknown = await getPublicStatus(client).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401 });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('reports an answer out of its schema as a contract failure', async () => {
    server.use(http.get(subscriptionsUrl(PUBLIC_STATUS_PATH), () => HttpResponse.json({})));
    const { client } = createSubscriptionsClient();

    const failure: unknown = await getPublicStatus(client).catch((error: unknown) => error);

    expect(failure).toMatchObject({ kind: 'contract' });
  });

  it('gives up after 10 s (research D7)', async () => {
    const health = createHealthMonitoringMock();
    health.publicStatus.hang();
    vi.useFakeTimers();
    const { client } = createSubscriptionsClient();
    const outcome = getPublicStatus(client).catch((error: unknown) => error);
    let settled = false;
    void outcome.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(PUBLIC_STATUS_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    expect(PUBLIC_STATUS_TIMEOUT_MS).toBe(10_000);
    expect(await outcome).toMatchObject({ kind: 'timeout' });
  });
});
