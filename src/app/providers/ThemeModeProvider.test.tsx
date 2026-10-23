import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeModeProvider, useThemeMode } from './ThemeModeProvider';

const STORAGE_KEY = 'maily-backoffice:theme-mode';

/**
 * jsdom does not implement `matchMedia` (research.md D4): a minimal double that supports exactly
 * what `ThemeModeProvider` needs — reading `.matches` and listening for `change` — so the
 * system-preference tests below don't depend on a real browser. `vi.stubGlobal`'s value parameter
 * is `unknown` (Vitest cannot know `window.matchMedia`'s real return type from a string name), so
 * this only needs to behave like a `MediaQueryList` at runtime, not satisfy its typed, overloaded
 * `addEventListener` — no type assertion needed (constitution II).
 */
type ChangeListener = (event: Event & { readonly matches: boolean }) => void;

function fakeMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<ChangeListener>();
  const mediaQueryList = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_type: 'change', listener: ChangeListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: 'change', listener: ChangeListener) => {
      listeners.delete(listener);
    },
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mediaQueryList));
  return {
    setMatches(value: boolean) {
      matches = value;
      // A real `Event`, with `.matches` merged in: jsdom has no `MediaQueryListEvent` constructor,
      // and the provider only ever reads `.matches` off the event it gets (`Object.assign`'s
      // inferred return type already carries both, so there is nothing to assert here either).
      const event = Object.assign(new Event('change'), { matches: value });
      listeners.forEach((listener) => {
        listener(event);
      });
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useThemeMode', () => {
  it('fails with a clear error outside the provider (same contract as useAppSettings/useNotify)', () => {
    // React reports the error that nobody catches through console.error as well.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useThemeMode())).toThrow(/ThemeModeProvider/);
  });

  it('toggle() flips the mode and marks the choice as explicit', () => {
    fakeMatchMedia(false);
    const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe('oscuro');
    expect(result.current.source).toBe('explicita');

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe('claro');
    expect(result.current.source).toBe('explicita');
  });

  describe('initial mode (data-model.md → Preferencia de Tema, transiciones 1-2)', () => {
    it('without a saved choice, starts from the system preference and marks it as such', () => {
      fakeMatchMedia(true);

      const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

      expect(result.current.mode).toBe('oscuro');
      expect(result.current.source).toBe('sistema');
    });

    it('without a saved choice and a light system preference, starts in light mode', () => {
      fakeMatchMedia(false);

      const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

      expect(result.current.mode).toBe('claro');
      expect(result.current.source).toBe('sistema');
    });

    it('with a valid saved choice, starts from it and marks the choice as explicit', () => {
      fakeMatchMedia(false);
      localStorage.setItem(STORAGE_KEY, 'oscuro');

      const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

      expect(result.current.mode).toBe('oscuro');
      expect(result.current.source).toBe('explicita');
    });

    it.each(['', 'OSCURO', 'dark', '"oscuro"'])(
      'discards a stored value that is not exactly "claro"/"oscuro" (%j) and falls back to system',
      (corrupted) => {
        fakeMatchMedia(true);
        localStorage.setItem(STORAGE_KEY, corrupted);

        const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

        expect(result.current.mode).toBe('oscuro');
        expect(result.current.source).toBe('sistema');
      },
    );
  });

  describe('system preference while open (data-model.md, transiciones 4-5; FR-006/FR-007)', () => {
    it('follows a live system change while there is no explicit choice yet', () => {
      const system = fakeMatchMedia(false);
      const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });
      expect(result.current.mode).toBe('claro');

      act(() => {
        system.setMatches(true);
      });

      expect(result.current.mode).toBe('oscuro');
      expect(result.current.source).toBe('sistema');

      act(() => {
        system.setMatches(false);
      });

      expect(result.current.mode).toBe('claro');
      expect(result.current.source).toBe('sistema');
    });

    it('stops following the system once the person has chosen explicitly', () => {
      const system = fakeMatchMedia(false);
      const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

      act(() => {
        result.current.toggle();
      });
      expect(result.current.mode).toBe('oscuro');
      expect(result.current.source).toBe('explicita');

      act(() => {
        system.setMatches(true); // the system "changes" to dark too, but it no longer matters
      });

      expect(result.current.mode).toBe('oscuro');
      act(() => {
        system.setMatches(false);
      });
      expect(result.current.mode).toBe('oscuro'); // still the explicit choice, not light
    });
  });

  describe('persistence (data-model.md, transición 3)', () => {
    it('toggle() persists the new value under the documented key', () => {
      fakeMatchMedia(false);
      const { result } = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('oscuro');

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBe('claro');
    });

    it('a persisted choice survives a remount of the provider (same localStorage)', () => {
      fakeMatchMedia(false);
      const first = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });
      act(() => {
        first.result.current.toggle();
      });
      expect(first.result.current.mode).toBe('oscuro');
      first.unmount();

      const second = renderHook(() => useThemeMode(), { wrapper: ThemeModeProvider });

      expect(second.result.current.mode).toBe('oscuro');
      expect(second.result.current.source).toBe('explicita');
    });
  });
});
