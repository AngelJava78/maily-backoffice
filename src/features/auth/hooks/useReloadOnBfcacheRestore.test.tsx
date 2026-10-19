import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useReloadOnBfcacheRestore } from './useReloadOnBfcacheRestore';

function showPage(persisted: boolean): void {
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted }));
}

describe('useReloadOnBfcacheRestore', () => {
  it('reloads the page when the browser restores it from its back/forward cache (FR-011, US3-2)', () => {
    const reload = vi.fn<() => void>();
    renderHook(() => {
      useReloadOnBfcacheRestore(reload);
    });

    showPage(true);

    expect(reload).toHaveBeenCalledOnce();
  });

  it('leaves a page that was loaded normally alone', () => {
    const reload = vi.fn<() => void>();
    renderHook(() => {
      useReloadOnBfcacheRestore(reload);
    });

    showPage(false);

    expect(reload).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts', () => {
    const reload = vi.fn<() => void>();
    const { unmount } = renderHook(() => {
      useReloadOnBfcacheRestore(reload);
    });

    unmount();
    showPage(true);

    expect(reload).not.toHaveBeenCalled();
  });
});
