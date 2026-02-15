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
      fontFamily: "'Roboto', sans-serif",
      h1: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
      },
      h2: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
      },
      h3: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
      },
      h4: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
      },
      h5: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
      },
      h6: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
      },
      subtitle1: {
        fontFamily: "'ConneqtRegular', sans-serif",
        fontWeight: 400,
        textTransform: 'uppercase',
      },
      body1: {
        fontFamily: "'Roboto', sans-serif",
        fontWeight: 400,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '4px',
            textTransform: 'none',
          },
        },
      },
    },
  });

// Export a light theme as default for backward compatibility
const theme = createAppTheme('light');
export default theme;
