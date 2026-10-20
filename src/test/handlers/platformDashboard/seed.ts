import { dashboardDto, type DashboardDto } from '../../factories';

/**
 * The summary as the tests find it: the fictitious data that the service answers in its phase 1,
 * from `src/integrations/dummy_dashboard_source.py` of `maily-system-api` (spec 003 of the service),
 * with its default limit of five recent clinics.
 */
export function phaseOneDashboard(): DashboardDto {
  return dashboardDto();
}
