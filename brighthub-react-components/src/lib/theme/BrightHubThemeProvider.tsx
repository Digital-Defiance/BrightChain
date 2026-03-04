/**
 * BrightHub Theme Provider
 * Wraps MUI ThemeProvider with BrightHub-specific theme configuration.
 * Delegates light/dark mode to the parent AppThemeProvider from express-suite
 * so that mode is shared across the entire app.
 */

import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
  PaletteMode,
  Theme,
} from '@mui/material/styles';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { useTheme as useAppTheme } from '@digitaldefiance/express-suite-react-components';

import {
  brightHubBorderRadius,
  brightHubColors,
  brightHubSpacing,
  brightHubTypography,
} from './theme-tokens';

export type ThemeMode = 'light' | 'dark';

/**
 * Attempts to read the mode from the parent AppThemeProvider.
 * Returns null if no parent theme context exists (e.g. standalone/test usage).
 */
function useParentThemeMode(): {
  mode: PaletteMode;
  toggleColorMode: () => void;
  setColorMode: (mode: PaletteMode) => void;
} | null {
  try {
    // useAppTheme throws if not inside AppThemeProvider
    return useAppTheme();
  } catch {
    return null;
  }
}

export interface BrightHubThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  colors: typeof brightHubColors;
  spacing: typeof brightHubSpacing;
  borderRadius: typeof brightHubBorderRadius;
  typography: typeof brightHubTypography;
  muiTheme: Theme;
}

const BrightHubThemeContext = createContext<BrightHubThemeContextValue | null>(
  null,
);

/**
 * Creates an MUI theme from BrightHub design tokens
 */
function createBrightHubMuiTheme(mode: ThemeMode): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: brightHubColors.primary.main,
        light: brightHubColors.primary.light,
        dark: brightHubColors.primary.dark,
        contrastText: brightHubColors.primary.contrastText,
      },
      secondary: {
        main: brightHubColors.secondary.main,
        light: brightHubColors.secondary.light,
        dark: brightHubColors.secondary.dark,
        contrastText: brightHubColors.secondary.contrastText,
      },
      error: {
        main: brightHubColors.error.main,
        light: brightHubColors.error.light,
        dark: brightHubColors.error.dark,
      },
      success: {
        main: brightHubColors.success.main,
        light: brightHubColors.success.light,
        dark: brightHubColors.success.dark,
      },
      warning: {
        main: brightHubColors.warning.main,
        light: brightHubColors.warning.light,
        dark: brightHubColors.warning.dark,
      },
      background: {
        default: isDark
          ? brightHubColors.background.dark
          : brightHubColors.background.default,
        paper: isDark ? '#192734' : brightHubColors.background.paper,
      },
      text: {
        primary: isDark ? '#FFFFFF' : brightHubColors.text.primary,
        secondary: isDark ? '#8899A6' : brightHubColors.text.secondary,
        disabled: brightHubColors.text.disabled,
      },
      divider: isDark ? '#38444D' : brightHubColors.divider,
    },
    typography: {
      fontFamily: brightHubTypography.fontFamily.primary,
      fontSize: 14,
      h1: { fontWeight: brightHubTypography.fontWeight.bold },
      h2: { fontWeight: brightHubTypography.fontWeight.bold },
      h3: { fontWeight: brightHubTypography.fontWeight.semibold },
      h4: { fontWeight: brightHubTypography.fontWeight.semibold },
      h5: { fontWeight: brightHubTypography.fontWeight.medium },
      h6: { fontWeight: brightHubTypography.fontWeight.medium },
      button: { fontWeight: brightHubTypography.fontWeight.semibold },
    },
    shape: {
      borderRadius: brightHubBorderRadius.md,
    },
    spacing: brightHubSpacing.sm,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: brightHubBorderRadius.full,
            textTransform: 'none',
            fontWeight: brightHubTypography.fontWeight.semibold,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: brightHubBorderRadius.lg,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: brightHubBorderRadius.full,
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            borderRadius: brightHubBorderRadius.full,
          },
        },
      },
    },
  });
}

export interface BrightHubThemeProviderProps {
  children: ReactNode;
  /** Only used as fallback when no parent AppThemeProvider exists (e.g. tests) */
  defaultMode?: ThemeMode;
}

/**
 * BrightHubThemeProvider
 *
 * Provides theming context for all BrightHub components.
 * Wraps MUI ThemeProvider with BrightHub-specific design tokens.
 *
 * Light/dark mode is read from the parent AppThemeProvider so that
 * the entire app shares a single mode toggle. If no parent theme
 * context exists (standalone / test usage), falls back to local state.
 *
 * @example
 * ```tsx
 * <AppThemeProvider>
 *   <BrightHubThemeProvider>
 *     <App />
 *   </BrightHubThemeProvider>
 * </AppThemeProvider>
 * ```
 */
export function BrightHubThemeProvider({
  children,
  defaultMode = 'light',
}: BrightHubThemeProviderProps) {
  const parentTheme = useParentThemeMode();

  // Fallback local state only used when there's no parent AppThemeProvider
  const [localMode, setLocalMode] = useState<ThemeMode>(defaultMode);

  const mode: ThemeMode = parentTheme
    ? (parentTheme.mode as ThemeMode)
    : localMode;

  const toggleMode = parentTheme
    ? parentTheme.toggleColorMode
    : () => setLocalMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const setMode = parentTheme
    ? (m: ThemeMode) => parentTheme.setColorMode(m)
    : setLocalMode;

  const muiTheme = useMemo(() => createBrightHubMuiTheme(mode), [mode]);

  const value = useMemo<BrightHubThemeContextValue>(
    () => ({
      mode,
      toggleMode,
      setMode,
      colors: brightHubColors,
      spacing: brightHubSpacing,
      borderRadius: brightHubBorderRadius,
      typography: brightHubTypography,
      muiTheme,
    }),
    [mode, toggleMode, setMode, muiTheme],
  );

  return (
    <BrightHubThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </BrightHubThemeContext.Provider>
  );
}

/**
 * Hook to access BrightHub theme context
 *
 * @throws Error if used outside of BrightHubThemeProvider
 */
export function useBrightHubTheme(): BrightHubThemeContextValue {
  const context = useContext(BrightHubThemeContext);
  if (!context) {
    throw new Error(
      'useBrightHubTheme must be used within a BrightHubThemeProvider',
    );
  }
  return context;
}

export default BrightHubThemeProvider;
