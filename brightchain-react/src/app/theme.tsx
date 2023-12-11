// src/app/theme.tsx

import { CONSTANTS } from '@brightchain/brightchain-lib';
import { createTheme, PaletteMode } from '@mui/material/styles';

export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: CONSTANTS.THEME_COLORS.CHAIN_BLUE,
        light: CONSTANTS.THEME_COLORS.CHAIN_BLUE_LIGHT,
        dark: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
        contrastText: '#ffffff',
      },
      secondary: {
        main: CONSTANTS.THEME_COLORS.BRIGHT_CYAN,
        light: CONSTANTS.THEME_COLORS.BRIGHT_CYAN_LIGHT,
        dark: CONSTANTS.THEME_COLORS.BRIGHT_CYAN_DARK,
        contrastText: '#000000',
      },
      background:
        mode === 'light'
          ? {
              default: '#f8f9fa',
              paper: '#ffffff',
            }
          : {
              default: '#121212',
              paper: '#1e1e1e',
            },
      text: {
        primary: mode === 'light' ? '#212121' : '#ffffff',
      },
      error: {
        main: CONSTANTS.THEME_COLORS.ERROR_RED,
      },
      warning: {
        main: CONSTANTS.THEME_COLORS.ALERT_ORANGE,
      },
      success: {
        main: CONSTANTS.THEME_COLORS.SECURE_GREEN,
      },
    },
    typography: {
      fontFamily: "'IBM Plex Sans', sans-serif",
      h1: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      },
      h2: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      },
      h3: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      },
      h4: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      },
      h5: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      },
      h6: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 400,
      },
      subtitle1: {
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 400,
        textTransform: 'uppercase',
      },
      body1: {
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 400,
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            background:
              mode === 'light'
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                : 'linear-gradient(135deg, #0a0a14 0%, #0d1117 100%)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '4px',
            textTransform: 'none',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 150ms ease',
            '&:hover': {
              backgroundColor:
                mode === 'light'
                  ? 'rgba(0, 0, 0, 0.04)'
                  : 'rgba(255, 255, 255, 0.08)',
            },
            '&.Mui-selected': {
              backgroundColor:
                mode === 'light'
                  ? 'rgba(25, 118, 210, 0.08)'
                  : 'rgba(25, 118, 210, 0.16)',
            },
            '&.Mui-focusVisible': {
              outline: `2px solid ${CONSTANTS.THEME_COLORS.CHAIN_BLUE}`,
              outlineOffset: -2,
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'background-color 150ms ease',
            '&:hover': {
              backgroundColor:
                mode === 'light'
                  ? 'rgba(0, 0, 0, 0.04)'
                  : 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            backgroundColor: CONSTANTS.THEME_COLORS.CHAIN_BLUE,
            color: '#ffffff',
            transition: 'background-color 200ms ease',
            '&:hover': {
              backgroundColor: CONSTANTS.THEME_COLORS.CHAIN_BLUE_DARK,
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            transition: 'background-color 150ms ease, box-shadow 150ms ease',
          },
        },
      },
    },
  });

// Export a light theme as default for backward compatibility
const theme = createAppTheme('light');
export default theme;
