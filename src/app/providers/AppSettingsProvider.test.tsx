import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { parseBuildInfo } from '../config/buildInfo';
import { AppSettingsProvider, useAppSettings } from './AppSettingsProvider';

/** The provider with the configuration of an environment whose Panel refreshes every `minutes`. */
function refreshingEvery(minutes: number) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <AppSettingsProvider
        env={{
          VITE_DASHBOARD_REFRESH_MINUTES: minutes,
          VITE_MAILYSOFT_APP_URL: undefined,
          VITE_HEALTH_REFRESH_SECONDS: 30,
        }}
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
      <AppSettingsProvider
        env={{
          VITE_DASHBOARD_REFRESH_MINUTES: 5,
          VITE_MAILYSOFT_APP_URL: url,
          VITE_HEALTH_REFRESH_SECONDS: 30,
        }}
      >
        {children}
      </AppSettingsProvider>
    );
  };
}

/** The provider with the configuration of an environment whose health page refreshes every `seconds`. */
function checkingHealthEvery(seconds: number) {
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return (
      <AppSettingsProvider
        env={{
          VITE_DASHBOARD_REFRESH_MINUTES: 5,
          VITE_MAILYSOFT_APP_URL: undefined,
          VITE_HEALTH_REFRESH_SECONDS: seconds,
        }}
      >
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

    expect(result.current).toMatchObject({
      dashboardRefreshMs: ms,
      mailySoftAppUrl: undefined,
      healthRefreshMs: 30_000,
    });
  });

  it.each([
    [30, 30_000],
    [10, 10_000],
  ])(
    'gives the interval of «Salud de servicios» in milliseconds: %d seconds are %d ms',
    (seconds, ms) => {
      const { result } = renderHook(() => useAppSettings(), {
        wrapper: checkingHealthEvery(seconds),
      });

      expect(result.current.healthRefreshMs).toBe(ms);
    },
  );

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

  it('gives the identification of the build, as parseBuildInfo reads it (feature 016, FR-044)', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: refreshingEvery(5) });

    expect(result.current.backofficeBuild).toEqual(
      parseBuildInfo({
        version: __APP_VERSION__,
        commit: __APP_COMMIT_SHA__,
        buildDate: __APP_BUILD_DATE__,
      }),
    );
    // The version of package.json reaches it; the tests are built without commit nor date.
    expect(result.current.backofficeBuild.version).toBe('1.0.0');
  });

  it('fails with a clear error outside the provider', () => {
    // React reports the error that nobody catches through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAppSettings())).toThrow(/AppSettingsProvider/);
  });
});
