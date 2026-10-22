import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppSettingsProvider, useAppSettings } from './AppSettingsProvider';

/** The provider with the configuration of an environment whose Panel refreshes every `minutes`. */
function refreshingEvery(minutes: number) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <AppSettingsProvider
        env={{ VITE_DASHBOARD_REFRESH_MINUTES: minutes, VITE_MAILYSOFT_APP_URL: undefined }}
      >
        {children}
      </AppSettingsProvider>
    );
  };
}

/** The provider with the configuration of an environment whose "Sin acceso" link is `url`. */
function linkingTo(url: string | undefined) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <AppSettingsProvider env={{ VITE_DASHBOARD_REFRESH_MINUTES: 5, VITE_MAILYSOFT_APP_URL: url }}>
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

    expect(result.current).toEqual({ dashboardRefreshMs: ms, mailySoftAppUrl: undefined });
  });

  it('gives the link to MailySoft exactly as the environment set it (feature 006, FR-015)', () => {
    const { result } = renderHook(() => useAppSettings(), {
      wrapper: linkingTo('https://clinicas.mailysoft.example'),
    });

    expect(result.current.mailySoftAppUrl).toBe('https://clinicas.mailysoft.example');
  });

  it('gives undefined when the environment has no link to MailySoft', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: linkingTo(undefined) });

    expect(result.current.mailySoftAppUrl).toBeUndefined();
  });

  it('fails with a clear error outside the provider', () => {
    // React reports the error that nobody catches through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAppSettings())).toThrow(/AppSettingsProvider/);
  });
});
