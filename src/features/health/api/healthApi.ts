import type { HttpClient } from '@/shared/api/httpClient';

import { healthResultSchema, type HealthResult } from '../schemas/healthResult';
import { publicStatusSchema, type PlatformStatus } from '../schemas/publicStatus';

/**
 * The aggregator of the health of the platform (contracts/health-aggregator.md). It belongs to
 * `maily-system-api`, so it is asked with the client of that service, with the token (research
 * D4). The paths of the API stay in this layer, so a change of contract does not reach the
 * components.
 */
export const HEALTH_RESULT_PATH = '/api/v1/health';

/**
 * The worst case of the aggregator is 12 s (research D7): 5 s to authorize and 7 s to aggregate,
 * so its time limit is 15 s instead of the 30 s of the client.
 */
export const AGGREGATOR_TIMEOUT_MS = 15_000;

/** A1: the result. A 403 or a 503 is passed on as it comes; what it means is decided above. */
export function getHealthResult(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<HealthResult> {
  return client.get(HEALTH_RESULT_PATH, {
    schema: healthResultSchema,
    signal,
    timeoutMs: AGGREGATOR_TIMEOUT_MS,
  });
}

/** The public status, at the root of the service, not below `/api/v1` (contracts/public-status.md). */
export const PUBLIC_STATUS_PATH = '/health/status';

/** It does not authorize: its worst case is a new aggregation, 7 s (research D7). */
export const PUBLIC_STATUS_TIMEOUT_MS = 10_000;

/**
 * P1: the public status of the platform, without the token and without cookies (FR-056): it works
 * when the access cannot be checked, and a 401 is one more failure, never the end of the session.
 */
export function getPublicStatus(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<PlatformStatus> {
  return client.get(PUBLIC_STATUS_PATH, {
    schema: publicStatusSchema,
    signal,
    anonymous: true,
    timeoutMs: PUBLIC_STATUS_TIMEOUT_MS,
  });
}
