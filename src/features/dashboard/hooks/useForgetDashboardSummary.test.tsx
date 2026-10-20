import { QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { dashboardDto } from '@/test/factories';
import { createWrapper } from '@/test/renderWithProviders';

import { dashboardSummarySchema } from '../schemas/dashboardSummary';
import { dashboardKeys } from './dashboardKeys';
import { useForgetDashboardSummary } from './useForgetDashboardSummary';

/** A query client that already keeps the summary of phase 1. */
function clientWithSummary(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(dashboardKeys.summary(), {
    kind: 'summary',
    summary: dashboardSummarySchema.parse(dashboardDto()),
  });
  return queryClient;
}

describe('useForgetDashboardSummary', () => {
  it('takes the summary out of the cache when it is told to forget it (FR-014)', () => {
    const queryClient = clientWithSummary();
    const { wrapper } = createWrapper({ queryClient });

    renderHook(
      () => {
        useForgetDashboardSummary(true);
      },
      { wrapper },
    );

    expect(queryClient.getQueryData(dashboardKeys.summary())).toBeUndefined();
  });

  it('leaves the summary alone otherwise', () => {
    const queryClient = clientWithSummary();
    const { wrapper } = createWrapper({ queryClient });

    renderHook(
      () => {
        useForgetDashboardSummary(false);
      },
      { wrapper },
    );

    expect(queryClient.getQueryData(dashboardKeys.summary())).toMatchObject({ kind: 'summary' });
  });

  it('forgets it as soon as it is told to, while it is mounted', () => {
    const queryClient = clientWithSummary();
    const { wrapper } = createWrapper({ queryClient });
    const { rerender } = renderHook(
      ({ forget }) => {
        useForgetDashboardSummary(forget);
      },
      {
        wrapper,
        initialProps: { forget: false },
      },
    );

    rerender({ forget: true });

    expect(queryClient.getQueryData(dashboardKeys.summary())).toBeUndefined();
  });
});
