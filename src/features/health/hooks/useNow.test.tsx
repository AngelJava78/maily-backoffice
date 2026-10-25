import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useNow } from './useNow';

const START = Date.parse('2026-10-30T10:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

/** The tab is hidden or shown again; the event reaches `window`, as the one of the browser does. */
function setVisibility(visibility: DocumentVisibilityState): void {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility);
  act(() => {
    window.dispatchEvent(new Event('visibilitychange'));
  });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useNow', () => {
  it('gives the time of the browser, and moves it every second while the tab is visible', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { result } = renderHook(() => useNow());

    expect(result.current).toBe(START);

    await advance(1_000);
    expect(result.current).toBe(START + 1_000);

    await advance(2_000);
    expect(result.current).toBe(START + 3_000);
  });

  it('stops while the tab is hidden, and catches up as soon as it is shown again', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { result } = renderHook(() => useNow());
    setVisibility('hidden');

    await advance(5_000);
    expect(result.current).toBe(START);

    setVisibility('visible');
    expect(result.current).toBe(START + 5_000);
  });

  it('gives the same time to every component that reads it', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    function Clock({ label }: { readonly label: string }) {
      return <p aria-label={label}>{useNow()}</p>;
    }
    render(
      <>
        <Clock label="first" />
        <Clock label="second" />
      </>,
    );

    await advance(1_500);

    expect(screen.getByLabelText('first')).toHaveTextContent(String(START + 1_000));
    expect(screen.getByLabelText('second')).toHaveTextContent(String(START + 1_000));
  });

  it('starts from the current time when it is read again after a while without readers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const first = renderHook(() => useNow());
    first.unmount();

    await advance(60_000);
    const { result } = renderHook(() => useNow());

    expect(result.current).toBe(START + 60_000);
  });

  it('asks for no timer once nobody reads it', () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
