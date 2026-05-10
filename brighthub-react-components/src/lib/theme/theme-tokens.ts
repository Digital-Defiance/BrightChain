/**
 * BrightHub Theme Tokens
 * Defines the design tokens for the BrightHub social network UI
 */

export const brightHubColors = {
  primary: {
    main: '#1DA1F2',
    light: '#71C9F8',
    dark: '#0D8BD9',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#14171A',
    light: '#657786',
    dark: '#000000',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#FFFFFF',
    paper: '#F5F8FA',
    dark: '#15202B',
  },
  text: {
    primary: '#14171A',
    secondary: '#657786',
    disabled: '#AAB8C2',
  },
  divider: '#E1E8ED',
  error: {
    main: '#E0245E',
    light: '#FF6B8A',
    dark: '#B01E4A',
  },
  success: {
    main: '#17BF63',
    light: '#4CD97B',
    dark: '#0F9D4F',
  },
  warning: {
    main: '#FFAD1F',
    light: '#FFC44D',
    dark: '#E09600',
  },
} as const;

export const brightHubSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const brightHubBorderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

export const brightHubTypography = {
  fontFamily: {
    primary:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
    xxl: '2rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export type BrightHubColors = typeof brightHubColors;
export type BrightHubSpacing = typeof brightHubSpacing;
export type BrightHubBorderRadius = typeof brightHubBorderRadius;
export type BrightHubTypography = typeof brightHubTypography;
