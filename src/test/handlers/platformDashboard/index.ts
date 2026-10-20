import { http, HttpResponse } from 'msw';

import type { DashboardDto } from '../../factories';
import { server } from '../../server';
import { createFailureControls } from '../shared/failures';
import { createRequestLog } from '../shared/requestLog';
import { createAuthorization } from '../subscriptionsCatalog/authorize';
import { SUBSCRIPTIONS_API_BASE_URL } from '../subscriptionsCatalog/baseUrl';
import { toErrorResponse } from '../subscriptionsCatalog/handle';
import { CatalogError } from '../subscriptionsCatalog/model';
import type { UsersDirectoryMock } from '../usersDirectory';
import { phaseOneDashboard } from './seed';

export { phaseOneDashboard } from './seed';

/** The path of the summary, below the base of the service of the subscriptions. */
const DASHBOARD_PATH = '/api/v1/dashboard';

/** The codes the service answers with when it is down. */
const DEFAULT_CODES: ReadonlyMap<number, string> = new Map([
  [500, 'internal_error'],
  [503, 'authorization_unavailable'],
]);

/**
 * Simulates `GET /api/v1/dashboard` of `maily-system-api` at network level, in the order of the
 * service (contracts/dashboard-service.md): who is asking (401), the failures a test injected, the
 * permission `dashboard:read` (403, or 503 when the users API does not answer) and the summary,
 * with `Cache-Control: no-store`. It registers itself in the shared MSW server.
 *
 * With `directory`, the permission comes from the simulator of the users service, as the real
 * service asks the users API on every request: a role that loses `dashboard:read` gets a 403 from
 * the next request on. Without it, every token of the tests (`Bearer test-token:<sub>`) may read the
 * summary, which is what the tests of hooks and components need.
 */
export function createPlatformDashboardMock({
  directory,
  initial = phaseOneDashboard(),
}: {
  readonly directory?: UsersDirectoryMock;
  readonly initial?: DashboardDto;
} = {}) {
  let summary: DashboardDto = initial;
  const log = createRequestLog(SUBSCRIPTIONS_API_BASE_URL);
  const failures = createFailureControls({ defaultCodes: DEFAULT_CODES });
  const authorization = createAuthorization(directory);

  server.use(
    http.get(`${SUBSCRIPTIONS_API_BASE_URL}${DASHBOARD_PATH}`, async ({ request }) => {
      const recorded = await log.record(request);
      try {
        const sub = authorization.authenticate(request);
        const injected = await failures.intercept(request, recorded.path);
        if (injected !== null) {
          return injected;
        }
        authorization.requirePermission(sub, 'dashboard:read');
        return HttpResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) {
        if (error instanceof CatalogError) {
          return toErrorResponse(error);
        }
        throw error;
      }
    }),
  );

  return {
    /** Every request the service has received, in order. */
    requests: log.requests,
    get requestCount(): number {
      return log.requests.length;
    },
    /** The requests with this method to this path (a text for an exact one, or a pattern). */
    requestsTo(method: string, path: string | RegExp) {
      return log.requests.filter(
        (request) =>
          request.method === method.toUpperCase() &&
          (typeof path === 'string' ? request.path === path : path.test(request.path)),
      );
    },

    ...failures.controls,
    /** Back to answering normally: no injected failure, and the permission can be checked. */
    recover(): void {
      failures.controls.recover();
      authorization.controls.recover();
    },
    /** From now on the users API does not answer: every request is `503 authorization_unavailable`. */
    authorizationUnavailable(): void {
      authorization.controls.unavailable();
    },

    // Change the data the next requests get; they apply no rule of the service.
    setSummary(overrides: Partial<DashboardDto>): void {
      summary = { ...summary, ...overrides };
    },
    /** These data come as `null`: their source failed. */
    setUnavailable(...fields: (keyof DashboardDto)[]): void {
      const next = { ...summary };
      for (const field of fields) {
        next[field] = null;
      }
      summary = next;
    },
    setRecentClinics(clinics: DashboardDto['recent_clinics']): void {
      summary = { ...summary, recent_clinics: clinics };
    },
  };
}

export type PlatformDashboardMock = ReturnType<typeof createPlatformDashboardMock>;
