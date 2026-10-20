import type { HttpHandler } from 'msw';

import { server } from '../../server';
import { createFailureControls } from '../shared/failures';
import { createRequestLog } from '../shared/requestLog';
import type { UsersDirectoryMock } from '../usersDirectory';
import { createAuthorization } from './authorize';
import { createHandlers } from './create';
import { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
import { createHandle, type Handle } from './handle';
import {
  createCatalogModel,
  type CatalogInitial,
  type CatalogModel,
  type CatalogSubscription,
  type SubscriptionChanges,
} from './model';
import { readHandlers } from './reads';
import { removeHandlers } from './remove';
import { defaultCatalog } from './seed';
import { statusHandlers } from './status';
import { updateHandlers } from './update';

export { SUBSCRIPTIONS_API_BASE_URL } from './baseUrl';
export { catalogSubscription } from './model';
export type { CatalogInitial, CatalogStatus, CatalogSubscription } from './model';
export { defaultCatalog, makeSubscriptions, quickstartCatalog } from './seed';

/** The codes the API answers with when it is down. */
const DEFAULT_CODES: ReadonlyMap<number, string> = new Map([
  [500, 'internal_error'],
  [503, 'authorization_unavailable'],
]);

/** The operations of the API that the simulator answers, each with the rules of the contract. */
const OPERATIONS: readonly ((model: CatalogModel, handle: Handle) => HttpHandler[])[] = [
  readHandlers,
  createHandlers,
  updateHandlers,
  statusHandlers,
  removeHandlers,
];

/**
 * Simulates the subscriptions API at network level with its data and its rules (research D14), and
 * registers itself in the shared MSW server. The token `Bearer test-token:<sub>` tells who is
 * asking, and the permissions come from the simulator of the users service (`directory`), as the
 * real API asks the users API on every request: a role that loses a permission makes both answer
 * accordingly from then on.
 */
export function createSubscriptionsCatalogMock({
  directory,
  initial = defaultCatalog(),
}: {
  readonly directory: UsersDirectoryMock;
  readonly initial?: CatalogInitial;
}) {
  const model = createCatalogModel(initial);
  const failures = createFailureControls({ defaultCodes: DEFAULT_CODES });
  const log = createRequestLog(SUBSCRIPTIONS_API_BASE_URL);
  const authorization = createAuthorization(directory);
  const handle = createHandle({ log, failures, authorization });

  server.use(...OPERATIONS.flatMap((operation) => operation(model, handle)));

  return {
    /** The data and its queries: `state.find(id)`, `state.list()`, `state.clinicsCountOf(id)`... */
    state: model,

    /** Every request the API has received, in order. */
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
    /** Back to answering normally: no injected failure, and the permissions can be checked. */
    recover(): void {
      failures.controls.recover();
      authorization.controls.recover();
    },
    /** From now on the users API does not answer: every request is `503 authorization_unavailable`. */
    authorizationUnavailable(): void {
      authorization.controls.unavailable();
    },
    /** The clinics API: without it the counts are «No disponible» and nothing can be deleted. */
    clinics: {
      unavailable(): void {
        model.setClinicsAvailable(false);
      },
      recover(): void {
        model.setClinicsAvailable(true);
      },
    },

    // Prepare the data of a test, or act as another person; they apply no rule of the API.
    addSubscription(subscription: CatalogSubscription): void {
      model.addSubscription(subscription);
    },
    addStatus(id: number, name: string): void {
      model.addStatus(id, name);
    },
    setClinics(id: number, count: number): void {
      model.setClinics(id, count);
    },
    setStatus(id: number, statusId: number): void {
      model.setStatus(id, statusId);
    },
    update(id: number, changes: SubscriptionChanges): void {
      model.edit(id, changes);
    },
    remove(id: number): void {
      model.markDeleted(id);
    },
  };
}

export type SubscriptionsCatalogMock = ReturnType<typeof createSubscriptionsCatalogMock>;
