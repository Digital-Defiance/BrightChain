import { createTheme, Theme } from '@mui/material/styles';

export const createAppTheme = (): Theme =>
  createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#286470', // caribbean-current
        dark: '#0f6c99', // brightchain-darkblue
        light: '#14a7df', // brightchain-lightblue
        contrastText: '#ffffff', // white
      },
      secondary: {
        main: '#50bbe8', // process-cyan
      },
      warning: {
        main: '#f6af1a', // xanthous
      },
      error: {
        main: '#fd0001', // off-red-rgb
      },
      info: {
        main: '#c5e4f0', // columbia-blue
      },
      success: {
        main: '#2f642f', // brightchain-green
      },
    },
  });

const theme = createAppTheme();

export default theme;
