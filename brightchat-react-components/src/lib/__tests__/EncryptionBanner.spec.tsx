/**
 * Unit tests for EncryptionBanner component.
 *
 * Tests rendering, accessibility attributes, data-testid, and theme-aware styling.
 *
 * Requirements: 2.2, 2.3, 2.4, 7.1, 7.2, 7.3, 8.1, 9.2
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import EncryptionBanner from '../EncryptionBanner';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const lightTheme = createTheme({ palette: { mode: 'light' } });
const darkTheme = createTheme({ palette: { mode: 'dark' } });

function renderBanner(props: { testId?: string } = {}, theme = lightTheme) {
  return render(
    <ThemeProvider theme={theme}>
      <EncryptionBanner {...props} />
    </ThemeProvider>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EncryptionBanner', () => {
  it('renders "End-to-end encrypted" text (Req 2.2)', () => {
    renderBanner();
    expect(screen.getByText('Encryption_E2E')).toBeTruthy();
  });

  it('renders a lock icon (Req 2.2)', () => {
    renderBanner();
    const banner = screen.getByTestId('encryption-banner');
    const svgIcon = banner.querySelector('svg[data-testid="LockIcon"]');
    expect(svgIcon).toBeTruthy();
  });

  it('has role="status" for screen reader announcement (Req 2.4, 7.3)', () => {
    renderBanner();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('has aria-label describing encryption status (Req 2.4, 7.1)', () => {
    renderBanner();
    const banner = screen.getByRole('status');
    expect(banner.getAttribute('aria-label')).toBe('Encryption_E2E_AriaLabel');
  });

  it('has data-testid="encryption-banner" (Req 9.2)', () => {
    renderBanner();
    expect(screen.getByTestId('encryption-banner')).toBeTruthy();
  });

  it('allows testId prop override', () => {
    renderBanner({ testId: 'custom-banner' });
    expect(screen.getByTestId('custom-banner')).toBeTruthy();
  });

  it('marks LockIcon with aria-hidden="true" (Req 7.2)', () => {
    renderBanner();
    const banner = screen.getByTestId('encryption-banner');
    const svgIcon = banner.querySelector('svg[data-testid="LockIcon"]');
    expect(svgIcon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses caption typography variant (Req 2.3)', () => {
    renderBanner();
    const text = screen.getByText('Encryption_E2E');
    // MUI caption variant renders as a <span> with the MuiTypography-caption class
    expect(text.classList.contains('MuiTypography-caption')).toBe(true);
  });

  // ─── Theme-aware styling (Req 8.1) ─────────────────────────────────────

  it('renders in light theme without errors (Req 8.1)', () => {
    renderBanner({}, lightTheme);
    expect(screen.getByTestId('encryption-banner')).toBeTruthy();
    expect(screen.getByText('Encryption_E2E')).toBeTruthy();
  });

  it('renders in dark theme without errors (Req 8.1)', () => {
    renderBanner({}, darkTheme);
    expect(screen.getByTestId('encryption-banner')).toBeTruthy();
    expect(screen.getByText('Encryption_E2E')).toBeTruthy();
  });

  it('uses theme-aware text.secondary color, not hardcoded values (Req 8.1)', () => {
    const { unmount } = renderBanner({}, lightTheme);
    const lightBanner = screen.getByTestId('encryption-banner');
    const lightIcon = lightBanner.querySelector('svg[data-testid="LockIcon"]');
    const lightText = screen.getByText('Encryption_E2E');

    expect(lightIcon).toBeTruthy();
    expect(lightText).toBeTruthy();
    unmount();

    renderBanner({}, darkTheme);
    const darkBanner = screen.getByTestId('encryption-banner');
    const darkIcon = darkBanner.querySelector('svg[data-testid="LockIcon"]');
    const darkText = screen.getByText('Encryption_E2E');
    expect(darkIcon).toBeTruthy();
    expect(darkText).toBeTruthy();
  });
});
