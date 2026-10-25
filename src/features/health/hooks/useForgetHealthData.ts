import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { healthKeys } from './healthKeys';

/**
 * Takes every datum of «Salud de servicios» out of the cache while `shouldForget` is true: when
 * the person loses `health:read`, what they could see must not come back if the permission does
 * (FR-032, research D21). It keeps the cache, a store outside the component, in step with a change
 * of the permissions that comes from the periodic check of the access, as the Panel does.
 */
export function useForgetHealthData(shouldForget: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (shouldForget) {
      queryClient.removeQueries({ queryKey: healthKeys.all });
    }
  }, [shouldForget, queryClient]);
}
