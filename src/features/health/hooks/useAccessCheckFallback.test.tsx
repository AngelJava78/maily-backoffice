import { focusManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient } from '@/app/providers/createQueryClient';
import { createHealthMonitoringMock } from '@/test/handlers/healthMonitoring';
import { createHealthProbesMock } from '@/test/handlers/healthProbes';
import { createWrapper } from '@/test/renderWithProviders';

import { healthKeys } from './healthKeys';
import { useAccessCheckFallback } from './useAccessCheckFallback';
import { useDirectCheckSection } from './useDirectCheckSection';
import { usePlatformStatusSection } from './usePlatformStatusSection';

const PUBLIC_STATUS_PATH = '/health/status';
const MINUTE_MS = 60_000;

afterEach(() => {
  vi.useRealTimers();
  focusManager.setFocused(undefined);
});

/** The real `setTimeout`, taken before any test fakes the clock. */
const realSetTimeout = globalThis.setTimeout;

/** Lets the work under way go on without moving the clock. */
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

/** The chain of the failure screen and its section, with a round and a pause that tests change. */
function setup() {
  const health = createHealthMonitoringMock();
  vi.useFakeTimers();
  const queryClient = createQueryClient();
  const { wrapper } = createWrapper({ queryClient });
  const view = renderHook(
    ({ round, paused }: { round: number; paused: boolean }) => {
      useAccessCheckFallback({ round, paused });
      return usePlatformStatusSection('access');
    },
    { wrapper, initialProps: { round: 0, paused: false } },
  );
  const asked = () => health.requestsTo('GET', PUBLIC_STATUS_PATH);
  return { health, queryClient, asked, ...view };
}

describe('useAccessCheckFallback', () => {
  it('asks for the public status once when the screen appears (FR-061)', async () => {
    const { asked, result } = setup();

    await eventually(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(asked()).toHaveLength(1);
  });

  it('asks nothing while the access is being checked, and cancels what was on its way (FR-065)', async () => {
    const { health, asked, rerender } = setup();
    health.publicStatus.defer();
    rerender({ round: 0, paused: false });
    await eventually(() => {
      expect(asked()).toHaveLength(1);
    });

    rerender({ round: 0, paused: true });

    await eventually(() => {
      expect(asked()[0]?.aborted).toBe(true);
    });
    expect(asked()).toHaveLength(1);
  });

  it('asks again once the new round of «Reintentar» fails again, keeping what it showed meanwhile', async () => {
    const { health, asked, result, rerender } = setup();
    await eventually(() => {
      expect(result.current.status).toBe('ready');
    });

    rerender({ round: 1, paused: true });
    await settle();
    expect(asked()).toHaveLength(1);

    const release = health.publicStatus.defer();
    rerender({ round: 1, paused: false });
    await eventually(() => {
      expect(asked()).toHaveLength(2);
    });
    expect(result.current).toMatchObject({ status: 'ready', isRefreshing: true });
    release();
    await eventually(() => {
      expect(result.current).toMatchObject({ status: 'ready', isRefreshing: false });
    });
  });

  it('asks nothing more on its own: neither the time, the tab nor a check nobody asked for (SC-015)', async () => {
    const { asked, result, rerender } = setup();
    await eventually(() => {
      expect(result.current.status).toBe('ready');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * MINUTE_MS);
    });
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    rerender({ round: 0, paused: true });
    rerender({ round: 0, paused: false });
    await settle();

    expect(asked()).toHaveLength(1);
  });

  it('completes a round that a check nobody asked for cut short, asking once more (FR-071)', async () => {
    const { health, asked, result, rerender } = setup();
    health.publicStatus.defer();
    rerender({ round: 0, paused: false });
    await eventually(() => {
      expect(asked()).toHaveLength(1);
    });

    rerender({ round: 0, paused: true });
    await eventually(() => {
      expect(asked()[0]?.aborted).toBe(true);
    });
    health.publicStatus.recover();
    rerender({ round: 0, paused: false });

    await eventually(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(asked()).toHaveLength(2);
  });

  it('cancels everything and takes the section away when the screen goes (FR-064)', async () => {
    const { queryClient, unmount, result } = setup();
    await eventually(() => {
      expect(result.current.status).toBe('ready');
    });

    unmount();

    expect(queryClient.getQueryData(healthKeys.platformStatus('access'))).toBeUndefined();
  });
});

describe('useAccessCheckFallback and the direct check (user story 6)', () => {
  it('checks the services once the public status fails, is cancelled by «Reintentar» and never repeats on its own', async () => {
    const health = createHealthMonitoringMock();
    health.publicStatus.failAll(500);
    const probes = createHealthProbesMock();
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    const { wrapper } = createWrapper({ queryClient });
    const { result, rerender } = renderHook(
      ({ round, paused }: { round: number; paused: boolean }) => {
        useAccessCheckFallback({ round, paused });
        return useDirectCheckSection('access');
      },
      { wrapper, initialProps: { round: 0, paused: false } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await eventually(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(probes.allRequests()).toHaveLength(4);

    // «Reintentar»: the check of the access pauses the new round, which asks nothing meanwhile.
    rerender({ round: 1, paused: true });
    await settle();
    expect(probes.allRequests()).toHaveLength(4);

    // The check fails again: the new round asks the public status and checks the services again.
    rerender({ round: 1, paused: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await eventually(() => {
      expect(probes.allRequests()).toHaveLength(8);
    });

    // Ten minutes ask nothing more.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * MINUTE_MS);
    });
    await settle();
    expect(probes.allRequests()).toHaveLength(8);
    expect(health.requestsTo('GET', '/health/status')).toHaveLength(4);
  });
});
