import type { ProbeResult } from '@/shared/api/httpClient';
import { messages } from '@/shared/messages/es';

import { liveBodySchema, readyBodySchema, type ReadyCheck } from '../schemas/healthV1';

/** How `/health/live` answered: right, or anything else (data-model §4). */
export type LiveOutcome = 'ok' | 'failed';

/** How `/health/ready` answered: right, the 503 of the contract with its checks, or anything else. */
export type ReadyOutcome =
  | { readonly kind: 'ok' }
  | { readonly kind: 'unavailable'; readonly checks: readonly ReadyCheck[] }
  | { readonly kind: 'failed' };

/** What a row of the direct check says of a service (FR-069). */
export type DirectStatus = 'operational' | 'degraded' | 'unreachable';

export interface DirectCheckRow {
  readonly code: string;
  readonly name: string;
  readonly status: DirectStatus;
  /** Only when degraded: why, without repeating. */
  readonly explanations: readonly string[];
}

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

/**
 * L1 (contracts/health-v1-probes.md): right only with a 2xx and the body of the contract. A
 * network failure (a CORS block looks the same to the browser) or a time-out is `null`.
 */
export function liveOutcomeOf(probe: ProbeResult | null): LiveOutcome {
  return probe !== null && isSuccess(probe.status) && liveBodySchema.safeParse(probe.body).success
    ? 'ok'
    : 'failed';
}

/** L2: a 2xx with `ok`, a 503 with `unavailable`, both with valid checks; anything else fails. */
export function readyOutcomeOf(probe: ProbeResult | null): ReadyOutcome {
  if (probe === null) {
    return { kind: 'failed' };
  }
  const body = readyBodySchema.safeParse(probe.body);
  if (!body.success) {
    return { kind: 'failed' };
  }
  if (isSuccess(probe.status) && body.data.status === 'ok') {
    return { kind: 'ok' };
  }
  return probe.status === 503 && body.data.status === 'unavailable'
    ? { kind: 'unavailable', checks: body.data.checks }
    : { kind: 'failed' };
}

/** Why a check in error makes the service degraded; the database has a text of its own. */
function explanationOf(check: ReadyCheck): string {
  const { explanations } = messages.health.direct;
  if (check.name !== 'database') {
    return explanations.unknownCheck;
  }
  return check.error === 'not_configured' ? explanations.notConfigured : explanations.database;
}

/**
 * The row of a service (FR-069, research D10): its liveness decides whether it answers at all, and
 * its readiness whether it is ready, with the explanation of each check in error, without
 * repeating. Nothing of the answer itself reaches the screen.
 */
export function decideDirectStatus(
  live: LiveOutcome,
  ready: ReadyOutcome,
): Pick<DirectCheckRow, 'status' | 'explanations'> {
  if (live === 'failed') {
    return { status: 'unreachable', explanations: [] };
  }
  if (ready.kind === 'ok') {
    return { status: 'operational', explanations: [] };
  }
  const explanations =
    ready.kind === 'unavailable'
      ? [...new Set(ready.checks.filter((check) => check.status === 'error').map(explanationOf))]
      : [];
  return {
    status: 'degraded',
    explanations:
      explanations.length === 0 ? [messages.health.direct.explanations.notReady] : explanations,
  };
}
