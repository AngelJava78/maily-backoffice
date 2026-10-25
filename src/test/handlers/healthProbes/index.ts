import { http, HttpResponse } from 'msw';

import { server } from '../../server';
import { createRequestLog } from '../shared/requestLog';
import { SUBSCRIPTIONS_API_BASE_URL } from '../subscriptionsCatalog/baseUrl';
import { USERS_API_BASE_URL } from '../usersService';

/** The base of mailySoft-pacientes in the tests: another origin, as a configured service has. */
export const PATIENTS_BASE_URL = 'https://pacientes.example.test';

/** How a route of a service answers. */
export type ProbeMode =
  | 'up'
  | 'html200'
  | 'networkError'
  | 'hang'
  | { readonly status: number }
  | { readonly ready503: 'database' | 'not_configured' | 'unknownCheck' };

const READY_OK = {
  status: 'ok',
  checks: [{ name: 'database', status: 'ok', latency_ms: 12, error: null }],
};

/** The 503 of the contract v1, with the check in error that is asked for. */
function ready503(kind: 'database' | 'not_configured' | 'unknownCheck') {
  const check =
    kind === 'unknownCheck'
      ? { name: 'cache', status: 'error', latency_ms: 30, error: 'quota_exceeded' }
      : {
          name: 'database',
          status: 'error',
          latency_ms: 2001,
          error: kind === 'database' ? 'timeout' : 'not_configured',
        };
  return HttpResponse.json({ status: 'unavailable', checks: [check] }, { status: 503 });
}

function respond(mode: ProbeMode, route: 'live' | 'ready'): Response | Promise<Response> {
  if (mode === 'up') {
    return HttpResponse.json(route === 'live' ? { status: 'ok' } : READY_OK);
  }
  if (mode === 'html200') {
    return new HttpResponse('<!doctype html><title>MailySoft Backoffice</title>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
  if (mode === 'networkError') {
    // As the browser sees a service that is down, or a response that CORS blocks.
    return HttpResponse.error();
  }
  if (mode === 'hang') {
    return new Promise<Response>(() => undefined);
  }
  if ('status' in mode) {
    return HttpResponse.json({ status: 'ok' }, { status: mode.status });
  }
  return route === 'live' ? HttpResponse.json({ status: 'ok' }) : ready503(mode.ready503);
}

/**
 * Simulates `/health/live` and `/health/ready` of the services that the direct check reaches
 * (research D22): maily-system-api, mailySoft-usuarios and mailySoft-pacientes by default, each
 * with a mode per route, which a test changes. Every request is recorded with its
 * `authorization` (the credentials mode is seen with `watchFetchCalls`).
 */
export function createHealthProbesMock({
  services = [SUBSCRIPTIONS_API_BASE_URL, USERS_API_BASE_URL, PATIENTS_BASE_URL],
}: { readonly services?: readonly string[] } = {}) {
  const modes = new Map<string, ProbeMode>();
  const gates: (() => void)[] = [];
  let held = false;
  const logs = new Map(services.map((base) => [base, createRequestLog(base)]));

  const key = (base: string, route: 'live' | 'ready') => `${base} ${route}`;

  server.use(
    ...services.flatMap((base) =>
      (['live', 'ready'] as const).map((route) =>
        http.get(`${base}/health/${route}`, async ({ request }) => {
          await logs.get(base)?.record(request);
          if (held) {
            await new Promise<void>((resolve) => {
              gates.push(resolve);
            });
          }
          return respond(modes.get(key(base, route)) ?? 'up', route);
        }),
      ),
    ),
  );

  return {
    /** The requests that the service of this base received, in order. */
    requestsOf(base: string) {
      return logs.get(base)?.requests ?? [];
    },
    /** Every request to the routes of health, of every service. */
    allRequests() {
      return [...logs.values()].flatMap((log) => log.requests);
    },
    /** From now on both routes of this service answer in this mode (or only `route`). */
    setMode(base: string, mode: ProbeMode, route?: 'live' | 'ready'): void {
      for (const each of route === undefined ? (['live', 'ready'] as const) : [route]) {
        modes.set(key(base, each), mode);
      }
    },
    /** From now on the requests wait until the returned function is called, then are answered. */
    defer(): () => void {
      held = true;
      return () => {
        held = false;
        for (const release of gates.splice(0)) {
          release();
        }
      };
    },
  };
}

export type HealthProbesMock = ReturnType<typeof createHealthProbesMock>;
