import type { DashboardResult } from '../hooks/useDashboardSummary';

/**
 * Whether coming back to the tab must ask for the summary (FR-019): only once the interval passed
 * since the last successful refresh, or when there was none yet (`lastSuccessAt` is 0). Otherwise
 * the next automatic refresh comes when the interval is over.
 */
export function isRefreshDue(lastSuccessAt: number, now: number, intervalMs: number): boolean {
  return lastSuccessAt === 0 || now - lastSuccessAt >= intervalMs;
}

/**
 * The interval of the automatic refresh for what the query keeps: none once the service refused
 * the permission, until the Panel is entered again (FR-015); the configured one otherwise,
 * including before the first answer (FR-016).
 */
export function refreshIntervalFor(
  result: DashboardResult | undefined,
  intervalMs: number,
): number | false {
  return result?.kind === 'forbidden' ? false : intervalMs;
}
