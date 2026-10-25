import { focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import {
  createHealthMonitoringMock,
  type HealthMonitoringMock,
} from '@/test/handlers/healthMonitoring';
import { createUsersDirectoryMock } from '@/test/handlers/usersDirectory';
import { createWrapper } from '@/test/renderWithProviders';

import { healthKeys } from './healthKeys';
import { useHealthCycle, type HealthCycle } from './useHealthCycle';

// The timeline of user story 2 with the fake clock and an interval of 30 s: the requests that reach
// the simulator are the queries that were made.

const INTERVAL_MS = 30_000;
const MINUTE_MS = 60_000;
/** The first query of a cycle and its retry, a second later (research D7). */
const RETRY_MS = 1_000;
const at = (time: string) => Date.parse(`2026-10-30T${time}Z`);

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});

/** Moves the fake clock to `time`, running whatever is due on the way. */
async function advanceTo(time: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(time - Date.now());
  });
}

/** The real `setTimeout`, taken before any test fakes the clock. */
const realSetTimeout = globalThis.setTimeout;

/** Lets the work under way go on without moving the clock (lesson of feature 007). */
async function settle(): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < 3; turn += 1) {
      await vi.advanceTimersByTimeAsync(0);
      await new Promise<void>((resolve) => {
        realSetTimeout(resolve, 0);
      });
    }
  });
}

async function eventually(check: () => void): Promise<void> {
  await act(async () => {
    await vi.waitFor(check);
  });
}

/** The tab is hidden or shown again; TanStack Query listens to `visibilitychange` on `window`. */
function setTabVisibility(visibility: DocumentVisibilityState): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
  act(() => {
    window.dispatchEvent(new Event('visibilitychange'));
  });
}

/** The simulator, the fake clock at 10:00:00 and the hook with the query client of the app. */
function setup({ health = createHealthMonitoringMock() }: { health?: HealthMonitoringMock } = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(at('10:00:00'));
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ queryClient });
  const mount = () => renderHook(() => useHealthCycle(INTERVAL_MS), { wrapper });
  return {
    health,
    queryClient,
    mount,
    isFetching: () => queryClient.isFetching({ queryKey: healthKeys.all }) > 0,
    ...mount(),
  };
}

/** Waits until data newer than `after` is on screen and nothing is on its way; gives its time. */
async function untilUpdated(result: { readonly current: HealthCycle }, after = 0): Promise<number> {
  let updatedAt = 0;
  await eventually(() => {
    const { view } = result.current;
    expect(view.status === 'ready' && !view.isUpdating && view.updatedAt > after).toBe(true);
    updatedAt = view.status === 'ready' ? view.updatedAt : 0;
  });
  return updatedAt;
}

describe('useHealthCycle keeps the page up to date (user story 2)', () => {
  it('runs the next cycle one interval after the last one ended, and not before (US2-2, FR-024)', async () => {
    const health = createHealthMonitoringMock();
    const release = health.defer();
    const { result } = setup({ health });
    await eventually(() => {
      expect(health.requests).toHaveLength(1);
    });

    // The answer arrives at 10:00:01: the count starts then, not when the query was made.
    await advanceTo(at('10:00:01'));
    release();
    const firstAt = await untilUpdated(result);
    expect(firstAt).toBeGreaterThanOrEqual(at('10:00:01'));

    await advanceTo(firstAt + INTERVAL_MS - 1);
    expect(health.requests).toHaveLength(1);
    await advanceTo(firstAt + INTERVAL_MS);
    await eventually(() => {
      expect(health.requests).toHaveLength(2);
    });
  });

  it('asks nothing while the tab is hidden (US2-3, FR-021)', async () => {
    const { health, result, isFetching } = setup();
    const firstAt = await untilUpdated(result);

    setTabVisibility('hidden');
    await advanceTo(firstAt + 5 * INTERVAL_MS);

    expect(isFetching()).toBe(false);
    expect(health.requests).toHaveLength(1);
  });

  it('asks when coming back to the tab only once the interval passed since the last correct answer (US2-4, FR-023)', async () => {
    const { health, result, isFetching } = setup();
    const firstAt = await untilUpdated(result);

    // Hidden 9 s after the answer and shown again 10 s later: 19 s since the last correct answer.
    await advanceTo(firstAt + 9_000);
    setTabVisibility('hidden');
    await advanceTo(firstAt + 19_000);
    setTabVisibility('visible');
    await settle();
    expect(isFetching()).toBe(false);
    expect(health.requests).toHaveLength(1);

    // The cycle comes when its interval is over, as if the tab had never been hidden.
    await advanceTo(firstAt + INTERVAL_MS);
    const secondAt = await untilUpdated(result, firstAt);
    expect(health.requests).toHaveLength(2);

    // Hidden again until 10:02:00, past the interval: coming back asks at once.
    await advanceTo(secondAt + 1_000);
    setTabVisibility('hidden');
    await advanceTo(at('10:02:00'));
    expect(health.requests).toHaveLength(2);
    setTabVisibility('visible');
    await untilUpdated(result, secondAt);
    expect(health.requests).toHaveLength(3);
  });

  it('runs a cycle at once when the person asks, and counts the interval from its end (US2-5, FR-026)', async () => {
    const { health, result } = setup();
    const firstAt = await untilUpdated(result);
    await advanceTo(firstAt + 10_000);

    act(() => {
      result.current.refresh();
    });
    const secondAt = await untilUpdated(result, firstAt);
    expect(health.requests).toHaveLength(2);

    await advanceTo(firstAt + INTERVAL_MS);
    expect(health.requests).toHaveLength(2);
    await advanceTo(secondAt + INTERVAL_MS - 1);
    expect(health.requests).toHaveLength(2);
    await advanceTo(secondAt + INTERVAL_MS);
    await eventually(() => {
      expect(health.requests).toHaveLength(3);
    });
  });

  it('never runs two cycles at a time: asking ten times while one is on its way joins it (US2-6, FR-025)', async () => {
    const { health, result, isFetching } = setup();
    await untilUpdated(result);
    const release = health.defer();

    act(() => {
      for (let press = 0; press < 10; press += 1) {
        result.current.refresh();
      }
    });
    await settle();

    expect(isFetching()).toBe(true);
    expect(health.requests).toHaveLength(2);
    release();
    await eventually(() => {
      expect(isFetching()).toBe(false);
    });
    expect(health.requests).toHaveLength(2);
  });

  it('counts the interval from the end of a cycle that failed, its retry and its chain included (FR-024, FR-071)', async () => {
    const { health, result, queryClient } = setup();
    const aggregator = () => health.requestsTo('GET', '/api/v1/health').length;
    const firstAt = await untilUpdated(result);
    health.failAll(500);

    await advanceTo(firstAt + INTERVAL_MS);
    await advanceTo(firstAt + INTERVAL_MS + RETRY_MS);
    // The aggregator failed twice; then the public status answered, and the cycle ended there.
    await eventually(() => {
      expect(queryClient.getQueryState(healthKeys.platformStatus('page'))?.status).toBe('success');
    });
    expect(aggregator()).toBe(3);
    const endedAt =
      queryClient.getQueryState(healthKeys.platformStatus('page'))?.dataUpdatedAt ?? 0;
    health.recover();

    await advanceTo(endedAt + INTERVAL_MS - 1);
    expect(aggregator()).toBe(3);
    await advanceTo(endedAt + INTERVAL_MS);
    await eventually(() => {
      expect(aggregator()).toBe(4);
    });
  });

  it('cancels the query on its way when the page is left, and shows the data at once when it opens again (US2-7, FR-025)', async () => {
    const { health, result, unmount, mount } = setup();
    const firstAt = await untilUpdated(result);
    const release = health.defer();
    act(() => {
      result.current.refresh();
    });
    await eventually(() => {
      expect(health.requests).toHaveLength(2);
    });

    unmount();
    await eventually(() => {
      expect(health.requests[1]?.aborted).toBe(true);
    });

    const again = mount();
    expect(again.result.current.view).toMatchObject({ status: 'ready', updatedAt: firstAt });
    await eventually(() => {
      expect(again.result.current.view).toMatchObject({ isUpdating: true });
    });
    expect(health.requests).toHaveLength(3);
    release();
    await untilUpdated(again.result, firstAt);
    expect(health.requests).toHaveLength(3);
  });

  it('asks nothing more in the visit once the service refused the permission (FR-031)', async () => {
    const { health, result, isFetching } = setup({
      health: createHealthMonitoringMock({ directory: createUsersDirectoryMock() }),
    });
    await eventually(() => {
      expect(result.current.view.status).toBe('forbidden');
    });

    await advanceTo(Date.now() + 15 * MINUTE_MS);
    setTabVisibility('hidden');
    setTabVisibility('visible');
    await settle();

    expect(isFetching()).toBe(false);
    expect(health.requests).toHaveLength(1);
  });

  it('keeps the result in memory while the page is closed (FR-029)', async () => {
    const { result, unmount, queryClient } = setup();
    await untilUpdated(result);

    unmount();
    await advanceTo(Date.now() + 10 * MINUTE_MS);

    expect(queryClient.getQueryData(healthKeys.result())).toMatchObject({ kind: 'result' });
  });
});
