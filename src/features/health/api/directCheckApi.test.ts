import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAnonymousHttpClient } from '@/shared/api/httpClient';
import { messages } from '@/shared/messages/es';
import { watchFetchCalls } from '@/test/fetchCalls';
import { createHealthProbesMock, PATIENTS_BASE_URL } from '@/test/handlers/healthProbes';
import { SUBSCRIPTIONS_API_BASE_URL } from '@/test/handlers/subscriptionsCatalog/baseUrl';
import { USERS_API_BASE_URL } from '@/test/handlers/usersService';
import { createSubscriptionsClient } from '@/test/subscriptionsClient';

import {
  checkDirectTargets,
  DIRECT_CHECK_TIMEOUT_MS,
  directCheckTargets,
  type DirectCheckTarget,
} from './directCheckApi';

const { explanations } = messages.health.direct;

afterEach(() => {
  vi.useRealTimers();
});

/** The three services of the tests: the two of the platform, with their token, and pacientes. */
function targets(): DirectCheckTarget[] {
  const { client: subscriptions } = createSubscriptionsClient();
  const users = createAnonymousHttpClient({ baseUrl: USERS_API_BASE_URL });
  return directCheckTargets({
    subscriptions,
    users,
    healthServices: [
      {
        code: 'mailysoft-pacientes',
        name: 'mailySoft-pacientes',
        client: createAnonymousHttpClient({ baseUrl: PATIENTS_BASE_URL }),
      },
    ],
  });
}

describe('directCheckTargets', () => {
  it('lists maily-system-api, mailySoft-usuarios and then the configured services (FR-068)', () => {
    expect(targets().map(({ code, name }) => ({ code, name }))).toEqual([
      { code: 'maily-system-api', name: 'maily-system-api' },
      { code: 'mailysoft-usuarios', name: 'mailySoft-usuarios' },
      { code: 'mailysoft-pacientes', name: 'mailySoft-pacientes' },
    ]);
  });
});

describe('checkDirectTargets', () => {
  it('asks both routes of every service, without the token nor cookies, in the order of the services', async () => {
    const probes = createHealthProbesMock();
    probes.setMode(USERS_API_BASE_URL, { ready503: 'database' }, 'ready');
    probes.setMode(PATIENTS_BASE_URL, 'networkError');
    const calls = watchFetchCalls();

    const rows = await checkDirectTargets(targets());

    expect(rows).toEqual([
      {
        code: 'maily-system-api',
        name: 'maily-system-api',
        status: 'operational',
        explanations: [],
      },
      {
        code: 'mailysoft-usuarios',
        name: 'mailySoft-usuarios',
        status: 'degraded',
        explanations: [explanations.database],
      },
      {
        code: 'mailysoft-pacientes',
        name: 'mailySoft-pacientes',
        status: 'unreachable',
        explanations: [],
      },
    ]);
    expect(probes.allRequests().every((request) => request.authorization === null)).toBe(true);
    expect(new Set(calls().map((call) => call.credentials))).toEqual(new Set(['omit']));
  });

  it('adds the routes to the base as it is configured', async () => {
    const probes = createHealthProbesMock();

    await checkDirectTargets(targets());

    expect(
      probes
        .requestsOf(USERS_API_BASE_URL)
        .map((request) => request.path)
        .sort(),
    ).toEqual(['/health/live', '/health/ready']);
    expect(new URL(USERS_API_BASE_URL).pathname).toBe('/proxy/users');
  });

  it('says a service that answers with a page of HTML does not answer', async () => {
    const probes = createHealthProbesMock();
    probes.setMode(SUBSCRIPTIONS_API_BASE_URL, 'html200');

    const [systemApi] = await checkDirectTargets(targets());

    expect(systemApi?.status).toBe('unreachable');
  });

  it('gives up on a service after 5 s, without retrying, and gives every row at once', async () => {
    const probes = createHealthProbesMock();
    probes.setMode(PATIENTS_BASE_URL, 'hang');
    vi.useFakeTimers();
    let rows: Awaited<ReturnType<typeof checkDirectTargets>> | undefined;
    void checkDirectTargets(targets()).then((done) => {
      rows = done;
    });

    await vi.advanceTimersByTimeAsync(DIRECT_CHECK_TIMEOUT_MS - 1);
    expect(rows).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await vi.waitFor(() => {
      expect(rows).toBeDefined();
    });

    expect(rows?.map((row) => row.status)).toEqual(['operational', 'operational', 'unreachable']);
    expect(probes.requestsOf(PATIENTS_BASE_URL)).toHaveLength(2);
  });

  it('is cancelled with the signal it receives', async () => {
    const probes = createHealthProbesMock();
    probes.defer();
    const controller = new AbortController();
    const round = checkDirectTargets(targets(), { signal: controller.signal });
    await vi.waitFor(() => {
      expect(probes.allRequests()).toHaveLength(6);
    });

    controller.abort();

    await expect(round).rejects.toBeDefined();
  });
});
