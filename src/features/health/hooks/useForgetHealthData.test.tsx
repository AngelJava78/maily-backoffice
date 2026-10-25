import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { healthResultDto } from '@/test/factories';
import { createWrapper } from '@/test/renderWithProviders';

import { healthResultSchema } from '../schemas/healthResult';
import { healthKeys } from './healthKeys';
import { useForgetHealthData } from './useForgetHealthData';

/** A query client that already keeps a result of the aggregator and a step of the page. */
function clientWithData(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(healthKeys.result(), {
    kind: 'result',
    result: healthResultSchema.parse(healthResultDto()),
  });
  queryClient.setQueryData(healthKeys.cycle(), { kind: 'done' });
  return queryClient;
}

function mountWith(queryClient: QueryClient, shouldForget: boolean): void {
  const { wrapper } = createWrapper({ queryClient });
  renderHook(
    () => {
      useForgetHealthData(shouldForget);
    },
    { wrapper },
  );
}

describe('useForgetHealthData', () => {
  it('takes every datum of the health page out of the cache when it is told to (FR-032)', () => {
    const queryClient = clientWithData();

    mountWith(queryClient, true);

    expect(queryClient.getQueryCache().findAll({ queryKey: healthKeys.all })).toEqual([]);
  });

  it('leaves the data alone otherwise', () => {
    const queryClient = clientWithData();

    mountWith(queryClient, false);

    expect(queryClient.getQueryData(healthKeys.result())).toMatchObject({ kind: 'result' });
    expect(queryClient.getQueryData(healthKeys.cycle())).toEqual({ kind: 'done' });
  });
});
