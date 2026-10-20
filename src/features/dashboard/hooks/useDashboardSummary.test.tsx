import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import type { ApiError } from '@/shared/api/ApiError';
import { dashboardDto } from '@/test/factories';
import { createPlatformDashboardMock } from '@/test/handlers/platformDashboard';
import { createWrapper } from '@/test/renderWithProviders';

import { dashboardSummarySchema } from '../schemas/dashboardSummary';
import { dashboardKeys } from './dashboardKeys';
import { toDashboardView, useDashboardSummary, type DashboardView } from './useDashboardSummary';

const INTERVAL_MS = 300_000;

const phaseOne = dashboardSummarySchema.parse(dashboardDto());

/** The refusal of the service when the person lacks `dashboard:read`. */
const PERMISSION_DENIED = { status: 403, code: 'permission_denied' } as const;

/**
 * Mounts the hook with the query client of the application (its retries and its global notice of
 * 403, which `onForbidden` stands for). `before` prepares the simulator before the first request.
 */
function setup({
  onForbidden,
  before,
}: {
  readonly onForbidden?: (error: ApiError) => void;
  readonly before?: (platform: ReturnType<typeof createPlatformDashboardMock>) => void;
} = {}) {
  const platform = createPlatformDashboardMock();
  before?.(platform);
  const queryClient = createQueryClient({ onForbidden });
  const { wrapper } = createWrapper({ queryClient });
  const mount = () => renderHook(() => useDashboardSummary(INTERVAL_MS), { wrapper });
  return { platform, queryClient, mount, ...mount() };
}

async function untilStatus(
  result: { readonly current: DashboardView },
  status: DashboardView['status'],
): Promise<void> {
  await waitFor(() => {
    expect(result.current.status).toBe(status);
  });
}

describe('useDashboardSummary', () => {
  it('asks for the summary when it mounts, and is loading until it arrives', async () => {
    const { platform, result } = setup();

    expect(result.current).toEqual({ status: 'loading' });
    await untilStatus(result, 'ready');

    expect(platform.requestCount).toBe(1);
    const view = result.current;
    if (view.status !== 'ready') {
      throw new Error('Expected the summary to be ready');
    }
    expect(view).toEqual({
      status: 'ready',
      summary: phaseOne,
      updatedAt: view.updatedAt,
      isUpdating: false,
      refreshFailed: false,
    });
    expect(view.updatedAt).toBeGreaterThan(0);
  });

  it('asks again every time it mounts, even before 30 seconds (FR-018)', async () => {
    const { platform, result, unmount, mount } = setup();
    await untilStatus(result, 'ready');

    unmount();
    const again = mount();

    await waitFor(() => {
      expect(platform.requestCount).toBe(2);
    });
    await untilStatus(again.result, 'ready');
  });
});

// The refusal of the service is a result, not an error (FR-015, research D6).
describe('useDashboardSummary when the service refuses the permission', () => {
  it('is forbidden when the first answer is a 403, without the general notice of 403', async () => {
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const { platform, result } = setup({
      onForbidden,
      before: (mock) => {
        mock.failNext(PERMISSION_DENIED);
      },
    });

    await untilStatus(result, 'forbidden');

    expect(result.current).toEqual({ status: 'forbidden' });
    expect(onForbidden).not.toHaveBeenCalled();
    expect(platform.requestCount).toBe(1);
  });

  it('forgets the summary it had when a later answer is a 403', async () => {
    const onForbidden = vi.fn<(error: ApiError) => void>();
    const { platform, queryClient, result } = setup({ onForbidden });
    await untilStatus(result, 'ready');

    platform.failNext(PERMISSION_DENIED);
    await act(() => queryClient.refetchQueries({ queryKey: dashboardKeys.summary() }));

    await untilStatus(result, 'forbidden');
    expect(queryClient.getQueryData(dashboardKeys.summary())).toEqual({ kind: 'forbidden' });
    expect(onForbidden).not.toHaveBeenCalled();
  });

  it('asks again when it mounts again', async () => {
    const { platform, result, unmount, mount } = setup({
      before: (mock) => {
        mock.failNext(PERMISSION_DENIED);
      },
    });
    await untilStatus(result, 'forbidden');

    unmount();
    const again = mount();

    await untilStatus(again.result, 'ready');
    expect(platform.requestCount).toBe(2);
  });
});

describe('toDashboardView', () => {
  it('is loading while there is no result and no error', () => {
    expect(
      toDashboardView({ data: undefined, isFetching: true, isError: false, dataUpdatedAt: 0 }),
    ).toEqual({ status: 'loading' });
  });

  it('is forbidden when the service refused the permission, even while asking again', () => {
    expect(
      toDashboardView({
        data: { kind: 'forbidden' },
        isFetching: true,
        isError: false,
        dataUpdatedAt: 1_760_954_852_000,
      }),
    ).toEqual({ status: 'forbidden' });
  });

  it('has failed when there is no result and the query failed (FR-025)', () => {
    expect(
      toDashboardView({ data: undefined, isFetching: false, isError: true, dataUpdatedAt: 0 }),
    ).toEqual({ status: 'failed' });
  });

  it('keeps the summary and the time it arrived when a refresh failed, and says so (FR-024)', () => {
    expect(
      toDashboardView({
        data: { kind: 'summary', summary: phaseOne },
        isFetching: false,
        isError: true,
        dataUpdatedAt: 1_760_954_852_000,
      }),
    ).toEqual({
      status: 'ready',
      summary: phaseOne,
      updatedAt: 1_760_954_852_000,
      isUpdating: false,
      refreshFailed: true,
    });
  });

  it('keeps saying the refresh failed while the next one is on its way (FR-034, research D8)', () => {
    expect(
      toDashboardView({
        data: { kind: 'summary', summary: phaseOne },
        isFetching: true,
        isError: true,
        dataUpdatedAt: 1_760_954_852_000,
      }),
    ).toMatchObject({ status: 'ready', isUpdating: true, refreshFailed: true });
  });

  it('is ready with a summary, updated when the summary arrived', () => {
    expect(
      toDashboardView({
        data: { kind: 'summary', summary: phaseOne },
        isFetching: false,
        isError: false,
        dataUpdatedAt: 1_760_954_852_000,
      }),
    ).toEqual({
      status: 'ready',
      summary: phaseOne,
      updatedAt: 1_760_954_852_000,
      isUpdating: false,
      refreshFailed: false,
    });
  });
});
