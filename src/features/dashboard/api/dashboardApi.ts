import type { HttpClient } from '@/shared/api/httpClient';

import { dashboardSummarySchema, type DashboardSummary } from '../schemas/dashboardSummary';

/**
 * The summary of the platform (contracts/dashboard-service.md, D1). It belongs to `maily-system-api`,
 * the service of the subscriptions, so it is asked for with that client (research D3). The path of
 * the API stays in this layer, so a change of contract does not reach the components.
 */
export const DASHBOARD_PATH = '/api/v1/dashboard';

/**
 * D1: the summary, without `limit`: the list brings as many recent clinics as the service gives by
 * default (FR-006). A 403 is passed on as it comes; what it means for the Panel is decided above.
 */
export function getDashboard(
  client: HttpClient,
  { signal }: { readonly signal?: AbortSignal } = {},
): Promise<DashboardSummary> {
  return client.get(DASHBOARD_PATH, { schema: dashboardSummarySchema, signal });
}
