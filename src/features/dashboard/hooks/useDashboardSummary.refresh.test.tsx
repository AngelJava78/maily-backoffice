import { focusManager, onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { dashboardDto } from '@/test/factories';
import {
  createPlatformDashboardMock,
  type PlatformDashboardMock,
} from '@/test/handlers/platformDashboard';
import { createWrapper } from '@/test/renderWithProviders';
import { server } from '@/test/server';
import { subscriptionsUrl } from '@/test/subscriptionsClient';

import { dashboardSummarySchema } from '../schemas/dashboardSummary';
import { dashboardKeys } from './dashboardKeys';
import { useDashboardSummary, type DashboardView } from './useDashboardSummary';

// The timeline of data-model.md («Reglas de actualización»), with the fake clock and an interval
// of 5 minutes: the requests that reach the simulator are the queries that were made.

const INTERVAL_MS = 300_000;
const MINUTE_MS = 60_000;
/** The first query and its two retries, 1 and 2 seconds apart (constitution IV). */
const RETRIES_MS = 3_000;

const phaseOne = dashboardSummarySchema.parse(dashboardDto());

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

/** Moves the fake clock to `time`, running whatever is due on the way. */
async function advanceTo(time: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(time - Date.now());
  });
}

/** The real `setTimeout`, taken before any test fakes the clock. */
const realSetTimeout = globalThis.setTimeout;

/**
 * Lets the work that is under way go on, without moving the clock: TanStack Query reacts to the
 * focus and to the connection after an `await`, and a request that starts is answered meanwhile.
 * Without a fake timer due, only real turns of the event loop let that happen.
 */
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

/**
 * The simulator, the fake clock and the hook mounted with the query client of the application.
 * `before` prepares the simulator before the first request.
 */
function setup({
  intervalMs = INTERVAL_MS,
  before,
}: {
  readonly intervalMs?: number;
  readonly before?: (platform: PlatformDashboardMock) => void;
} = {}) {
  const platform = createPlatformDashboardMock();
  before?.(platform);
  vi.useFakeTimers();
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ queryClient });
  const mount = () => renderHook(() => useDashboardSummary(intervalMs), { wrapper });
  return {
    platform,
    mount,
    state: () => queryClient.getQueryState(dashboardKeys.summary()),
    isFetching: () => queryClient.isFetching({ queryKey: dashboardKeys.summary() }) > 0,
    ...mount(),
  };
}

/**
 * Waits until a summary newer than `after` is on screen and no query is on its way; gives the
 * moment it arrived, which is when the interval starts counting again.
 */
async function untilUpdated(
  result: { readonly current: DashboardView },
  after = 0,
): Promise<number> {
  let updatedAt = 0;
  await eventually(() => {
    const view = result.current;
    expect(view.status === 'ready' && !view.isUpdating && view.updatedAt > after).toBe(true);
    updatedAt = view.status === 'ready' ? view.updatedAt : 0;
  });
  return updatedAt;
}

describe('useDashboardSummary refreshes on its own (user story 3)', () => {
  it('asks again one interval after the last query ended, and not before (FR-016, FR-020)', async () => {
    const { platform, result, isFetching } = setup();
    const firstAt = await untilUpdated(result);

    await advanceTo(firstAt + INTERVAL_MS - 1);
    expect(isFetching()).toBe(false);
    expect(platform.requestCount).toBe(1);

    await advanceTo(firstAt + INTERVAL_MS);
    await eventually(() => {
      expect(platform.requestCount).toBe(2);
    });
  });

  it('counts the interval from the query made when the Panel is entered again (FR-020)', async () => {
    const { platform, result, unmount, mount } = setup();
    const firstAt = await untilUpdated(result);
    await advanceTo(firstAt + 2 * MINUTE_MS);

    unmount();
    const again = mount();
    const secondAt = await untilUpdated(again.result, firstAt);
    expect(platform.requestCount).toBe(2);

    await advanceTo(firstAt + INTERVAL_MS);
    expect(platform.requestCount).toBe(2);
    await advanceTo(secondAt + INTERVAL_MS - 1);
    expect(platform.requestCount).toBe(2);
    await advanceTo(secondAt + INTERVAL_MS);
    await eventually(() => {
      expect(platform.requestCount).toBe(3);
    });
  });

  it('waits a whole interval after a query that failed, without asking in a loop (FR-020, FR-026)', async () => {
    const { platform, result, state } = setup();
    const firstAt = await untilUpdated(result);
    platform.failAll(500);

    // The query of the cycle and its two retries, 1 and 2 seconds later (constitution IV).
    await advanceTo(firstAt + INTERVAL_MS);
    await advanceTo(firstAt + INTERVAL_MS + 3_000);
    await eventually(() => {
      expect(state()?.status).toBe('error');
    });
    expect(platform.requestCount).toBe(4);
    const failedAt = state()?.errorUpdatedAt ?? 0;
    platform.recover();

    await advanceTo(failedAt + INTERVAL_MS - 1);
    expect(platform.requestCount).toBe(4);
    await advanceTo(failedAt + INTERVAL_MS);
    await eventually(() => {
      expect(platform.requestCount).toBe(5);
    });
  });

  it('asks nothing while the tab is hidden (FR-017)', async () => {
    const { platform, result, isFetching } = setup();
    const firstAt = await untilUpdated(result);

    setTabVisibility('hidden');
    await advanceTo(firstAt + 15 * MINUTE_MS);

    expect(isFetching()).toBe(false);
    expect(platform.requestCount).toBe(1);
  });

  it('asks when coming back to the tab only once the interval passed since the last summary (FR-019)', async () => {
    const { platform, result, isFetching } = setup();
    const firstAt = await untilUpdated(result);

    // 10:02 → 10:05: three minutes since the last summary.
    setTabVisibility('hidden');
    await advanceTo(firstAt + 3 * MINUTE_MS);
    setTabVisibility('visible');
    await settle();
    expect(isFetching()).toBe(false);
    expect(platform.requestCount).toBe(1);

    // 10:05 → 10:10, with the cycle of 10:07 missed while hidden: eight minutes.
    setTabVisibility('hidden');
    await advanceTo(firstAt + 8 * MINUTE_MS);
    setTabVisibility('visible');
    const secondAt = await untilUpdated(result, firstAt);
    expect(platform.requestCount).toBe(2);

    // The next one is an interval after that one.
    await advanceTo(secondAt + INTERVAL_MS - 1);
    expect(platform.requestCount).toBe(2);
    await advanceTo(secondAt + INTERVAL_MS);
    await eventually(() => {
      expect(platform.requestCount).toBe(3);
    });
  });

  it('asks when coming back to the tab if the first load failed (FR-019)', async () => {
    const { platform, result, state } = setup({
      before: (mock) => {
        mock.failAll(500);
      },
    });
    await advanceTo(Date.now() + 3_000);
    await eventually(() => {
      expect(state()?.status).toBe('error');
    });
    expect(platform.requestCount).toBe(3);
    platform.recover();

    setTabVisibility('hidden');
    await advanceTo(Date.now() + 10_000);
    setTabVisibility('visible');

    await untilUpdated(result);
    expect(platform.requestCount).toBe(4);
  });

  it('asks nothing more after the service refused the permission, neither in a cycle nor coming back (FR-015)', async () => {
    const { platform, result, isFetching } = setup({
      before: (mock) => {
        mock.failNext({ status: 403, code: 'permission_denied' });
      },
    });
    await eventually(() => {
      expect(result.current.status).toBe('forbidden');
    });

    await advanceTo(Date.now() + 15 * MINUTE_MS);
    setTabVisibility('hidden');
    setTabVisibility('visible');
    await settle();

    expect(isFetching()).toBe(false);
    expect(platform.requestCount).toBe(1);
  });

  it('asks nothing when the connection comes back: only the cycle, entering and the tab ask (FR-016)', async () => {
    const { platform, result, isFetching } = setup();
    const firstAt = await untilUpdated(result);
    await advanceTo(firstAt + 2 * MINUTE_MS);

    act(() => {
      onlineManager.setOnline(false);
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await settle();

    expect(onlineManager.isOnline()).toBe(true);
    expect(isFetching()).toBe(false);
    expect(platform.requestCount).toBe(1);
  });

  it('cancels the request on its way when the Panel is left (FR-021)', async () => {
    const { platform, unmount } = setup({
      before: (mock) => {
        mock.defer();
      },
    });
    await eventually(() => {
      expect(platform.requestCount).toBe(1);
    });

    unmount();

    await eventually(() => {
      expect(platform.requests[0]?.aborted).toBe(true);
    });
  });

  it('never asks twice at a time: a cycle or coming back wait for the query on its way (FR-021)', async () => {
    // An interval shorter than the time limit of a request, so that a cycle comes while it waits.
    const { platform, isFetching } = setup({
      intervalMs: 10_000,
      before: (mock) => {
        mock.defer();
      },
    });
    await eventually(() => {
      expect(platform.requestCount).toBe(1);
    });

    await advanceTo(Date.now() + 10_000);
    setTabVisibility('hidden');
    setTabVisibility('visible');
    await settle();

    expect(isFetching()).toBe(true);
    expect(platform.requestCount).toBe(1);
  });

  it('keeps the summary while the Panel is closed and shows it at once, updating, when it opens again (FR-018, FR-022)', async () => {
    const { platform, result, unmount, mount } = setup();
    const firstAt = await untilUpdated(result);

    unmount();
    await advanceTo(firstAt + 10 * MINUTE_MS);
    expect(platform.requestCount).toBe(1);
    const again = mount();

    expect(again.result.current).toMatchObject({
      status: 'ready',
      updatedAt: firstAt,
      isUpdating: true,
    });
    const secondAt = await untilUpdated(again.result, firstAt);
    expect(secondAt).toBeGreaterThan(firstAt);
    expect(platform.requestCount).toBe(2);
  });

  it('says it is updating while a query is on its way with the data on screen (FR-009)', async () => {
    const { platform, result } = setup();
    const firstAt = await untilUpdated(result);
    const release = platform.defer();

    await advanceTo(firstAt + INTERVAL_MS);
    await eventually(() => {
      expect(result.current).toMatchObject({
        status: 'ready',
        updatedAt: firstAt,
        isUpdating: true,
      });
    });

    release();
    await untilUpdated(result, firstAt);
    expect(result.current).toMatchObject({ isUpdating: false });
  });
});

describe('useDashboardSummary when a query fails (user story 4)', () => {
  const DASHBOARD_URL = subscriptionsUrl('/api/v1/dashboard');

  /** Answers every request of the summary with `respond`, counting them. */
  function answerWith(respond: () => Response) {
    const counter = { requests: 0 };
    server.use(
      http.get(DASHBOARD_URL, () => {
        counter.requests += 1;
        return respond();
      }),
    );
    return counter;
  }

  it('has failed once the first load and its two retries failed (FR-025)', async () => {
    const { platform, result } = setup({
      before: (mock) => {
        mock.failAll(500);
      },
    });

    await advanceTo(Date.now() + RETRIES_MS);
    await eventually(() => {
      expect(result.current).toEqual({ status: 'failed' });
    });
    expect(platform.requestCount).toBe(3);
  });

  it('keeps the data and its time when a cycle fails, and says no more once a later one works (FR-024, FR-026)', async () => {
    const { platform, result, state } = setup();
    const firstAt = await untilUpdated(result);

    platform.authorizationUnavailable();
    await advanceTo(firstAt + INTERVAL_MS);
    await advanceTo(firstAt + INTERVAL_MS + RETRIES_MS);
    await eventually(() => {
      expect(result.current).toEqual({
        status: 'ready',
        summary: phaseOne,
        updatedAt: firstAt,
        isUpdating: false,
        refreshFailed: true,
      });
    });
    expect(platform.requestCount).toBe(4);

    platform.recover();
    await advanceTo((state()?.errorUpdatedAt ?? 0) + INTERVAL_MS);
    const secondAt = await untilUpdated(result, firstAt);

    expect(result.current).toMatchObject({ refreshFailed: false, updatedAt: secondAt });
    expect(platform.requestCount).toBe(5);
  });

  it('fails at once, without retrying, when the answer is out of contract (FR-027)', async () => {
    let counter = { requests: 0 };
    const { result } = setup({
      before: () => {
        counter = answerWith(() => HttpResponse.json(dashboardDto({ total_doctors: -1 })));
      },
    });

    await eventually(() => {
      expect(result.current).toEqual({ status: 'failed' });
    });
    await advanceTo(Date.now() + 10_000);
    expect(counter.requests).toBe(1);
  });

  it('retries a network failure twice before failing (constitution IV, FR-027)', async () => {
    let counter = { requests: 0 };
    const { result } = setup({
      before: () => {
        counter = answerWith(() => HttpResponse.error());
      },
    });

    await advanceTo(Date.now() + RETRIES_MS);
    await eventually(() => {
      expect(result.current).toEqual({ status: 'failed' });
    });
    expect(counter.requests).toBe(3);
  });
});
