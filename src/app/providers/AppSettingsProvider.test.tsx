import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppSettingsProvider, useAppSettings } from './AppSettingsProvider';

/** The provider with the configuration of an environment whose Panel refreshes every `minutes`. */
function refreshingEvery(minutes: number) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <AppSettingsProvider env={{ VITE_DASHBOARD_REFRESH_MINUTES: minutes }}>
        {children}
      </AppSettingsProvider>
    );
  };
}

describe('useAppSettings', () => {
  it.each([
    [5, 300_000],
    [1, 60_000],
  ])('gives the interval of the Panel in milliseconds: %d minutes are %d ms', (minutes, ms) => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: refreshingEvery(minutes) });

    expect(result.current).toEqual({ dashboardRefreshMs: ms });
  });

  it('fails with a clear error outside the provider', () => {
    // React reports the error that nobody catches through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAppSettings())).toThrow(/AppSettingsProvider/);
  });
});
