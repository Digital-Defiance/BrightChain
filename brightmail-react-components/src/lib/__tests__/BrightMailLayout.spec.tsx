/**
 * Unit tests for the refactored BrightMailLayout three-panel shell.
 *
 * Tests: BrightMailProvider wrapping, Sidebar rendering, Outlet rendering,
 * hamburger toggle on narrow viewports, reading pane at wide breakpoints,
 * route integration.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.6, 1.8
 */

import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockLocation = { pathname: '/brightmail' };

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

// Track useMediaQuery calls to control breakpoints
// Variable must be prefixed with "mock" to be accessible inside jest.mock()
let mockMediaQueryResults: Record<string, boolean> = {};

jest.mock('@mui/material/useMediaQuery', () => {
  return jest.fn((query: string) => {
    return mockMediaQueryResults[query] ?? false;
  });
});

jest.mock('@digitaldefiance/ecies-lib', () => ({
  IECIESConfig: {},
  Member: { newMember: jest.fn() },
  EmailString: jest.fn(),
}));

jest.mock('@digitaldefiance/suite-core-lib', () => ({
  SuiteCoreComponentId: 'suite-core',
  SuiteCoreStringKey: new Proxy(
    {},
    {
      get: (_t: unknown, p: string | symbol) => `suite-core:${String(p)}`,
    },
  ),
  SuiteCoreStringKeyValue: {},
}));

jest.mock('@brightchain/brightchain-lib', () => ({
  BrightChainComponentId: 'brightchain',
  BrightChainStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@brightchain/brightchain-react-components', () => ({
  BrightChainSubLogo: ({ subText }: { subText?: string }) => (
    <span data-testid="brightchain-sub-logo">{subText || 'SubLogo'}</span>
  ),
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    t: (key: string) => key,
    tBranded: (key: string) => key,
    changeLanguage: jest.fn(),
    currentLanguage: 'en',
  }),
}));

// Import after mocks
import BrightMailLayout from '../BrightMailLayout';

// ─── Helpers ────────────────────────────────────────────────────────────────

function setBreakpoint(mode: 'mobile' | 'tablet' | 'desktop' | 'wide') {
  switch (mode) {
    case 'mobile':
      mockMediaQueryResults = {
        '(min-width:961px)': false,
        '(min-width:1280px)': false,
      };
      break;
    case 'tablet':
      mockMediaQueryResults = {
        '(min-width:961px)': false,
        '(min-width:1280px)': false,
      };
      break;
    case 'desktop':
      mockMediaQueryResults = {
        '(min-width:961px)': true,
        '(min-width:1280px)': false,
      };
      break;
    case 'wide':
      mockMediaQueryResults = {
        '(min-width:961px)': true,
        '(min-width:1280px)': true,
      };
      break;
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BrightMailLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMediaQueryResults = {};
    mockLocation.pathname = '/brightmail';
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Requirement 1.5: Center content area renders Outlet
   */
  it('renders Outlet in the center content area', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  /**
   * Requirement 1.1: Sidebar renders on desktop viewports
   */
  it('renders Sidebar with navigation on desktop', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    // Sidebar renders the logo
    expect(screen.getByTestId('brightchain-sub-logo')).toBeInTheDocument();
    // Sidebar renders nav items
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Drafts')).toBeInTheDocument();
    expect(screen.getByText('Trash')).toBeInTheDocument();
  });

  /**
   * Requirement 1.2: Hamburger icon appears on narrow viewports
   */
  it('shows hamburger toggle button on narrow viewports', () => {
    setBreakpoint('mobile');
    render(<BrightMailLayout />);
    const hamburger = screen.getByLabelText('Toggle sidebar');
    expect(hamburger).toBeInTheDocument();
  });

  /**
   * Requirement 1.2: No hamburger on desktop
   */
  it('does not show hamburger on desktop viewports', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    expect(screen.queryByLabelText('Toggle sidebar')).not.toBeInTheDocument();
  });

  /**
   * Requirement 1.6: Reading pane appears at ≥1280px
   */
  it('renders reading pane placeholder on wide desktop', () => {
    setBreakpoint('wide');
    render(<BrightMailLayout />);
    expect(screen.getByText('Select an email to read')).toBeInTheDocument();
  });

  /**
   * Requirement 1.6: Reading pane hidden below 1280px
   */
  it('does not render reading pane below 1280px', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    expect(
      screen.queryByText('Select an email to read'),
    ).not.toBeInTheDocument();
  });

  /**
   * Requirement 1.8: BrightMailProvider wraps children (context available)
   */
  it('wraps layout with BrightMailProvider (compose FAB works)', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    // The Compose FAB is rendered by Sidebar which uses useBrightMail()
    // If context wasn't provided, this would throw
    expect(screen.getByLabelText('Compose')).toBeInTheDocument();
  });
});
