import { http, HttpResponse } from 'msw';

import type { HealthResultDto } from '@/features/health/schemas/healthResult';

import { server } from '../../server';
import { createFailureControls } from '../shared/failures';
import { createRequestLog } from '../shared/requestLog';
import { createAuthorization } from '../subscriptionsCatalog/authorize';
import { SUBSCRIPTIONS_API_BASE_URL } from '../subscriptionsCatalog/baseUrl';
import { createHandle } from '../subscriptionsCatalog/handle';
import type { UsersDirectoryMock } from '../usersDirectory';
import {
  fromSeed,
  resultFrom,
  type RegisteredComponent,
  type RegisteredComponentSeed,
} from './model';
import { publicStatusHandler } from './publicStatus';
import { listed, registryHandlers, type RegistrySettings } from './registry';

export {
  AGGREGATED_AT,
  integratedComponents,
  type RegisteredComponent,
  type RegisteredComponentSeed,
} from './model';

type HealthComponentDto = HealthResultDto['components'][number];

/** The path of the aggregator, below the base of maily-system-api. */
const HEALTH_PATH = '/api/v1/health';

/** The codes the service answers with when it is down. */
const DEFAULT_CODES: ReadonlyMap<number, string> = new Map([
  [500, 'internal_error'],
  [503, 'authorization_unavailable'],
]);

/**
 * Simulates the health monitoring of `maily-system-api` at network level (research D22), in the
 * order of the service: who is asking (401), the failures a test injected, the permission
 * `health:*` of the operation (403, or 503 when the users API does not answer) and the operation:
 * the aggregator `GET /api/v1/health` (contracts/health-aggregator.md), with `Cache-Control:
 * no-store`, and the registry `/api/v1/monitored-components` (contracts/monitored-components.md).
 * The aggregator reports the enabled registered components. The public status (user story 5) is
 * added to this same simulator.
 *
 * With `directory`, the permission comes from the simulator of the users service, as the real
 * service asks the users API on every request. Without it, every token of the tests may do anything.
 */
export function createHealthMonitoringMock({
  directory,
  registered = [],
}: {
  readonly directory?: UsersDirectoryMock;
  readonly registered?: readonly RegisteredComponentSeed[];
} = {}) {
  const components: RegisteredComponent[] = registered.map(fromSeed);
  const log = createRequestLog(SUBSCRIPTIONS_API_BASE_URL);
  const failures = createFailureControls({ defaultCodes: DEFAULT_CODES });
  const authorization = createAuthorization(directory);
  const handle = createHandle({ log, failures, authorization });
  // The public status fails on its own: its controls never touch those of the aggregator.
  const publicFailures = createFailureControls({ defaultCodes: DEFAULT_CODES });
  const settings: RegistrySettings = { allowedHosts: null, nextId: 1000 };
  const changes = new Map<string, Partial<HealthComponentDto>>();
  let fixedResult: HealthResultDto | null = null;
  let registryAvailable = true;

  function currentResult(): HealthResultDto {
    return fixedResult ?? resultFrom(components, { registryAvailable, changes });
  }

  server.use(
    http.get(
      `${SUBSCRIPTIONS_API_BASE_URL}${HEALTH_PATH}`,
      handle('health:read', () =>
        HttpResponse.json(currentResult(), { headers: { 'Cache-Control': 'no-store' } }),
      ),
    ),
    ...registryHandlers({ baseUrl: SUBSCRIPTIONS_API_BASE_URL, handle, components, settings }),
    publicStatusHandler({
      baseUrl: SUBSCRIPTIONS_API_BASE_URL,
      log,
      failures: publicFailures,
      currentResult,
    }),
  );

  return {
    /** Every request the service has received, in order. */
    requests: log.requests,
    /** The requests with this method to this path (a text for an exact one, or a pattern). */
    requestsTo(method: string, path: string | RegExp) {
      return log.requests.filter(
        (request) =>
          request.method === method.toUpperCase() &&
          (typeof path === 'string' ? request.path === path : path.test(request.path)),
      );
    },

    ...failures.controls,
    /** The failures of the public status `GET /health/status`, apart from those of the rest. */
    publicStatus: publicFailures.controls,
    /** Back to answering normally: no injected failure, and the permission can be checked. */
    recover(): void {
      failures.controls.recover();
      authorization.controls.recover();
    },
    /** From now on the users API does not answer: every request is `503 authorization_unavailable`. */
    authorizationUnavailable(): void {
      authorization.controls.unavailable();
    },

    // Change what the next requests get; they apply no rule of the service.
    /** From now on the aggregator answers exactly this result. */
    setResult(result: HealthResultDto): void {
      fixedResult = result;
    },
    /** The component with this code answers with this status (and these other fields). */
    setComponentStatus(
      code: string,
      status: string,
      extra: Partial<HealthComponentDto> = {},
    ): void {
      changes.set(code, { ...changes.get(code), status, ...extra });
      fixedResult = null;
    },
    /** The aggregator could not read the registry: it says so and uses the last copy it read. */
    setRegistryUnavailable(unavailable: boolean): void {
      registryAvailable = !unavailable;
    },
    /** The hosts that may be monitored (`HEALTH_ALLOWED_HOSTS`); `null`, the default, allows all. */
    setAllowedHosts(hosts: readonly string[] | null): void {
      settings.allowedHosts = hosts;
    },
    /** The registered components that are not deleted, by order and code, as the list gives them. */
    registered(): RegisteredComponent[] {
      return listed(components);
    },
    /** Another person deletes the component: the next operations on it are a 404. */
    removeBehindTheScenes(id: string): void {
      const index = components.findIndex((component) => component.id === id);
      const component = components[index];
      if (component !== undefined) {
        components.splice(index, 1, { ...component, deleted_at: new Date().toISOString() });
      }
    },
  };
}

export type HealthMonitoringMock = ReturnType<typeof createHealthMonitoringMock>;
