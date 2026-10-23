import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { createAppTheme, type ThemeMode } from '../theme/theme';

/** Whether `mode` comes from a choice the person made on this device, or from its system default. */
type ThemeModeSource = 'explicita' | 'sistema';

interface ThemeModeState {
  readonly mode: ThemeMode;
  readonly source: ThemeModeSource;
}

interface ThemeModeValue extends ThemeModeState {
  /** Flips `mode` and marks the choice as explicit (contracts/theme-mode.md). */
  readonly toggle: () => void;
}

const ThemeModeContext = createContext<ThemeModeValue | null>(null);

/** Only this device/browser, never synced (spec.md Clarifications). */
const STORAGE_KEY = 'maily-backoffice:theme-mode';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'claro' || value === 'oscuro';
}

/**
 * The mode at the moment this module runs, before React commits a first render: a saved, valid
 * choice wins (data-model.md transición 2); anything else — nothing saved, or a value that isn't
 * exactly `"claro"`/`"oscuro"` (research.md D3, constitution II: a boundary value is validated,
 * never trusted as-is) — falls back to the system preference (transición 1).
 */
function resolveInitialState(): ThemeModeState {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isThemeMode(stored)) {
    return { mode: stored, source: 'explicita' };
  }
  const prefersDark = window.matchMedia(SYSTEM_DARK_QUERY).matches;
  return { mode: prefersDark ? 'oscuro' : 'claro', source: 'sistema' };
}

/**
 * Applies the active appearance (light/dark, 009-dark-mode-toggle) to the whole application: owns
 * the mode, mounts MUI's `ThemeProvider` with the matching `createAppTheme(mode)`, and sets
 * `enableColorScheme` so the browser's own chrome (scrollbars, form controls) follows the active
 * mode too, instead of the OS preference the app never declared (research.md D5, FR-008). No other
 * place in the app should instantiate its own `ThemeProvider` (contracts/theme-mode.md).
 */
export function ThemeModeProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<ThemeModeState>(resolveInitialState);

  // Follows the system preference live, but only until the person makes an explicit choice
  // (data-model.md transición 4-5; FR-006): once `source` is `'explicita'`, this listener keeps
  // running but no longer changes `mode` — re-subscribing on every `source` change is how it knows
  // whether to act.
  useEffect(() => {
    if (state.source !== 'sistema') {
      return undefined;
    }
    const media = window.matchMedia(SYSTEM_DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setState({ mode: event.matches ? 'oscuro' : 'claro', source: 'sistema' });
    };
    media.addEventListener('change', onChange);
    return () => {
      media.removeEventListener('change', onChange);
    };
  }, [state.source]);

  const toggle = useCallback(() => {
    setState((prev) => {
      const mode: ThemeMode = prev.mode === 'claro' ? 'oscuro' : 'claro';
      window.localStorage.setItem(STORAGE_KEY, mode);
      return { mode, source: 'explicita' };
    });
  }, []);

  const value = useMemo<ThemeModeValue>(
    () => ({ mode: state.mode, source: state.source, toggle }),
    [state, toggle],
  );
  const theme = useMemo(() => createAppTheme(state.mode), [state.mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

/** The active appearance and the way to change it (contracts/theme-mode.md). */
export function useThemeMode(): ThemeModeValue {
  const value = useContext(ThemeModeContext);
  if (value === null) {
    throw new Error('useThemeMode must be used inside a ThemeModeProvider');
  }
  return value;
}
