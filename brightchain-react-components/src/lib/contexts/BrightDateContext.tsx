/**
 * BrightDateContext — Provides the user's BrightDate display preference
 * to all components in the tree.
 *
 * Components use `useBrightDateMode()` to get the current display mode,
 * then pass it to `formatDateByMode()` from brightchain-lib.
 *
 * The provider reads the preference from user settings (via API) and
 * falls back to `BrightDateDisplayMode.Dual` when no preference is set.
 *
 * The preference is also persisted to localStorage so it survives page
 * reloads without waiting for the API response.
 */

import {
  BrightDateDisplayMode,
  formatDateByMode,
  getDateTooltip,
  toBrightDateString,
} from '@brightchain/brightchain-lib';
import type { BrightDateValue } from '@brightchain/brightdate';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'brightDateDisplayMode';

/**
 * Read the persisted display mode from localStorage.
 * Returns undefined if not set or invalid.
 */
function readPersistedMode(): BrightDateDisplayMode | undefined {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && Object.values(BrightDateDisplayMode).includes(stored as BrightDateDisplayMode)) {
      return stored as BrightDateDisplayMode;
    }
  } catch {
    // localStorage unavailable (SSR, private browsing, etc.)
  }
  return undefined;
}

// ─── Context Value ──────────────────────────────────────────────────────────

export interface BrightDateContextValue {
  /** Current display mode preference */
  mode: BrightDateDisplayMode;
  /** Update the display mode (persists to user settings) */
  setMode: (mode: BrightDateDisplayMode) => void;
  /**
   * Format a date according to the user's preference.
   * Convenience wrapper around `formatDateByMode`.
   */
  formatDate: (date: BrightDateValue | Date | string, localeStr: string, precision?: number) => string;
  /**
   * Get the tooltip for hover modes.
   * In `hover` mode: returns BrightDate string.
   * In `hoverReverse` mode: returns locale date string.
   * In other modes: returns empty string.
   */
  getTooltip: (date: BrightDateValue | Date | string, localeStr?: string, precision?: number) => string;
  /**
   * Get just the BrightDate string (for custom rendering).
   */
  toBD: (date: BrightDateValue | Date | string, precision?: number) => string;
}

// ─── Context ────────────────────────────────────────────────────────────────

const BrightDateContext = createContext<BrightDateContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export interface BrightDateProviderProps {
  children: ReactNode;
  /** Initial mode from user settings. Defaults to Dual. */
  initialMode?: BrightDateDisplayMode;
  /** Callback when mode changes (for persisting to API). */
  onModeChange?: (mode: BrightDateDisplayMode) => void;
}

export const BrightDateProvider: FC<BrightDateProviderProps> = ({
  children,
  initialMode = BrightDateDisplayMode.Dual,
  onModeChange,
}) => {
  // Prefer localStorage over initialMode so the UI is instant on reload
  const [mode, setModeState] = useState<BrightDateDisplayMode>(
    () => readPersistedMode() ?? initialMode,
  );

  // Sync when initialMode changes (e.g. after API settings load)
  useEffect(() => {
    if (initialMode !== mode && !readPersistedMode()) {
      setModeState(initialMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  const setMode = useCallback(
    (newMode: BrightDateDisplayMode) => {
      setModeState(newMode);
      try {
        localStorage.setItem(STORAGE_KEY, newMode);
      } catch {
        // localStorage unavailable
      }
      onModeChange?.(newMode);
    },
    [onModeChange],
  );

  const formatDate = useCallback(
    (date: BrightDateValue | Date | string, localeStr: string, precision = 3) =>
      formatDateByMode(date, localeStr, mode, precision),
    [mode],
  );

  const getTooltip = useCallback(
    (date: BrightDateValue | Date | string, localeStr?: string, precision = 3) =>
      getDateTooltip(date, mode, localeStr, precision),
    [mode],
  );

  const toBD = useCallback(
    (date: BrightDateValue | Date | string, precision = 3) => toBrightDateString(date, precision),
    [],
  );

  const value = useMemo<BrightDateContextValue>(
    () => ({ mode, setMode, formatDate, getTooltip, toBD }),
    [mode, setMode, formatDate, getTooltip, toBD],
  );

  return (
    <BrightDateContext.Provider value={value}>
      {children}
    </BrightDateContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Access the BrightDate display mode and formatting utilities.
 *
 * Falls back to Dual mode if no provider is found in the tree
 * (graceful degradation for components rendered outside the provider).
 */
export function useBrightDateMode(): BrightDateContextValue {
  const ctx = useContext(BrightDateContext);
  if (ctx) return ctx;

  // Graceful fallback: dual mode when no provider is present
  return {
    mode: BrightDateDisplayMode.Dual,
    setMode: () => {
      /* no-op outside provider */
    },
    formatDate: (date: BrightDateValue | Date | string, localeStr: string, precision = 3) =>
      formatDateByMode(date, localeStr, BrightDateDisplayMode.Dual, precision),
    getTooltip: () => '',
    toBD: (date: BrightDateValue | Date | string, precision = 3) => toBrightDateString(date, precision),
  };
}
