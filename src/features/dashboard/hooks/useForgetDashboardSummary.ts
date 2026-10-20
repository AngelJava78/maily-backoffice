import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { dashboardKeys } from './dashboardKeys';

/**
 * Takes the summary of the Panel out of the cache while `forget` is true: when the person loses
 * `dashboard:read`, the data they could see must not come back if the permission does (FR-014).
 * It keeps the cache, a store outside the component, in step with a change of the permissions that
 * comes from the periodic check of the access and not from something the person did (research D7).
 */
export function useForgetDashboardSummary(forget: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (forget) {
      queryClient.removeQueries({ queryKey: dashboardKeys.all });
    }
  }, [forget, queryClient]);
}
