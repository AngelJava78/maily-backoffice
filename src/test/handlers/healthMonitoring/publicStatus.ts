import { http, HttpResponse } from 'msw';

import type { HealthResultDto } from '@/features/health/schemas/healthResult';

import type { FailureControls } from '../shared/failures';
import type { RequestLog } from '../shared/requestLog';

/** The path of the public status, at the root of maily-system-api, not below `/api/v1`. */
export const PUBLIC_STATUS_PATH = '/health/status';

/**
 * `GET /health/status` (contracts/public-status.md, P1): no authentication and no permission. It
 * answers the result the aggregator would give, cut to its public part (only the code, the name,
 * the kind, the status and the next start of each component), with failures of its own, apart
 * from those of the aggregator. The request is recorded with its `authorization`.
 */
export function publicStatusHandler({
  baseUrl,
  log,
  failures,
  currentResult,
}: {
  readonly baseUrl: string;
  readonly log: RequestLog;
  readonly failures: FailureControls;
  readonly currentResult: () => HealthResultDto;
}) {
  return http.get(`${baseUrl}${PUBLIC_STATUS_PATH}`, async ({ request }) => {
    const recorded = await log.record(request);
    const injected = await failures.intercept(request, recorded.path);
    if (injected !== null) {
      return injected;
    }
    const result = currentResult();
    return HttpResponse.json(
      {
        status: result.status,
        checked_at: result.checked_at,
        components: result.components.map((component) => ({
          code: component.code,
          name: component.name,
          kind: component.kind,
          status: component.status,
          next_start_at: component.next_start_at,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  });
}
