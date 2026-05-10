/**
 * Unit tests for KeyRotationNotice component.
 *
 * Tests rendering per reason type, accessibility attributes, data-testid,
 * and non-selectability styling.
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5, 9.6
 */

import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import KeyRotationNotice, { KeyRotationReason } from '../KeyRotationNotice';

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const lightTheme = createTheme({ palette: { mode: 'light' } });

function renderNotice(reason: KeyRotationReason) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <KeyRotationNotice reason={reason} timestamp={new Date()} />
    </ThemeProvider>,
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('KeyRotationNotice', () => {
  // ─── Reason text rendering (Req 6.2) ────────────────────────────────────

  it('renders correct text for member_joined (Req 6.2)', () => {
    renderNotice('member_joined');
    expect(screen.getByText('KeyRotation_MemberJoined')).toBeTruthy();
  });

  it('renders correct text for member_left (Req 6.2)', () => {
    renderNotice('member_left');
    expect(screen.getByText('KeyRotation_MemberLeft')).toBeTruthy();
  });

  it('renders correct text for member_removed (Req 6.2)', () => {
    renderNotice('member_removed');
    expect(screen.getByText('KeyRotation_MemberRemoved')).toBeTruthy();
  });

  // ─── Accessibility attributes (Req 6.4, 7.4) ───────────────────────────

  it('has role="status" (Req 6.4)', () => {
    renderNotice('member_joined');
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('has aria-live="polite" (Req 6.4, 7.4)', () => {
    renderNotice('member_joined');
    const notice = screen.getByRole('status');
    expect(notice.getAttribute('aria-live')).toBe('polite');
  });

  // ─── data-testid (Req 9.6) ─────────────────────────────────────────────

  it('has data-testid="key-rotation-notice" (Req 9.6)', () => {
    renderNotice('member_joined');
    expect(screen.getByTestId('key-rotation-notice')).toBeTruthy();
  });

  // ─── Non-selectability (Req 6.5) ───────────────────────────────────────

  it('is not selectable via userSelect: none (Req 6.5)', () => {
    renderNotice('member_joined');
    const notice = screen.getByTestId('key-rotation-notice');
    const style = window.getComputedStyle(notice);
    expect(style.userSelect).toBe('none');
  });

  // ─── Styling (Req 6.3) ─────────────────────────────────────────────────

  it('uses caption typography variant (Req 6.3)', () => {
    renderNotice('member_joined');
    const text = screen.getByText('KeyRotation_MemberJoined');
    expect(text.classList.contains('MuiTypography-caption')).toBe(true);
  });

  it('renders a lock icon with aria-hidden (Req 7.1)', () => {
    renderNotice('member_joined');
    const notice = screen.getByTestId('key-rotation-notice');
    const svgIcon = notice.querySelector('svg[data-testid="LockIcon"]');
    expect(svgIcon).toBeTruthy();
    expect(svgIcon?.getAttribute('aria-hidden')).toBe('true');
  });
});
