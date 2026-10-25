import type { HttpClient, ProbeResult } from '@/shared/api/httpClient';
import type { HttpClients } from '@/shared/api/httpClientsContext';
import { messages } from '@/shared/messages/es';

import {
  decideDirectStatus,
  liveOutcomeOf,
  readyOutcomeOf,
  type DirectCheckRow,
} from '../policy/directCheckRules';

/** The routes of the health contract v1, added to the base of each service as it is configured. */
export const LIVE_PATH = '/health/live';
export const READY_PATH = '/health/ready';

/** Each probe has 5 s and no retries (FR-068, research D7). */
export const DIRECT_CHECK_TIMEOUT_MS = 5_000;

/** A service the browser checks by itself, with the client of its base. */
export interface DirectCheckTarget {
  readonly code: string;
  readonly name: string;
  readonly client: HttpClient;
}

/**
 * The services of the direct check, in this order (FR-068, research D10): maily-system-api and
 * mailySoft-usuarios, with the clients the application already has, and then those of
 * `VITE_HEALTH_DIRECT_SERVICES`. Never an address of the registry, nor the database.
 */
export function directCheckTargets(clients: HttpClients): DirectCheckTarget[] {
  const { names } = messages.health.direct;
  return [
    { code: 'maily-system-api', name: names.systemApi, client: clients.subscriptions },
    { code: 'mailysoft-usuarios', name: names.users, client: clients.users },
    ...clients.healthServices,
  ];
}

/** A probe of a public route; `null` when it got no answer (network, CORS or time-out). */
async function probeOf(
  client: HttpClient,
  path: string,
  signal: AbortSignal | undefined,
): Promise<ProbeResult | null> {
  try {
    return await client.probe(path, { signal, timeoutMs: DIRECT_CHECK_TIMEOUT_MS });
  } catch (error) {
    // Cancelled by whoever asked: the round ends with it, it is not a service that does not answer.
    if (signal?.aborted === true) {
      throw error;
    }
    return null;
  }
}

/**
 * One round of the direct check (contracts/health-v1-probes.md): `/health/live` and
 * `/health/ready` of every service at once, without the token and without cookies, and every row
 * when all of them ended (≤ 5 s). Each failure is the status of its row: it never rejects, unless
 * it is cancelled.
 */
export async function checkDirectTargets(
  targets: readonly DirectCheckTarget[],
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<DirectCheckRow[]> {
  return Promise.all(
    targets.map(async ({ code, name, client }) => {
      const [live, ready] = await Promise.all([
        probeOf(client, LIVE_PATH, signal),
        probeOf(client, READY_PATH, signal),
      ]);
      return { code, name, ...decideDirectStatus(liveOutcomeOf(live), readyOutcomeOf(ready)) };
    }),
  );
}
