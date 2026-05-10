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
import { cleanup, render, screen } from '@testing-library/react';

// Import after mocks
import BrightMailLayout from '../BrightMailLayout';

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

jest.mock('@brightchain/brightchain-lib', () => {
  const mockEngine = {
    translate: jest.fn((_componentId: string, key: string) => key),
    translateEnum: jest.fn((_enumType: unknown, value: unknown) =>
      String(value),
    ),
    registerIfNotExists: jest.fn(),
    registerStringKeyEnum: jest.fn(),
    registerConstants: jest.fn(),
    hasInstance: jest.fn(() => true),
  };
  return {
    BrightChainComponentId: 'brightchain',
    BrightChainStrings: new Proxy(
      {},
      { get: (_t: unknown, p: string | symbol) => String(p) },
    ),
    THEME_COLORS: {
      CHAIN_BLUE: '#1976d2',
      CHAIN_BLUE_LIGHT: '#46b6fd',
      CHAIN_BLUE_DARK: '#0a60d0',
    },
    MessageEncryptionScheme: {
      NONE: 'none',
      SHARED_KEY: 'shared_key',
      RECIPIENT_KEYS: 'recipient_keys',
      S_MIME: 's_mime',
    },
    MAX_ATTACHMENT_SIZE_BYTES: 25 * 1024 * 1024,
    formatFileSize: (bytes: number) => `${bytes} B`,
    validateAttachmentSize: (size: number, max: number) => size <= max,
    validateTotalAttachmentSize: (sizes: number[], max: number) =>
      sizes.every((s: number) => s <= max) &&
      sizes.reduce((a: number, b: number) => a + b, 0) <= max,
    getBrightChainI18nEngine: () => mockEngine,
    registerI18nComponentPackage: jest.fn(),
  };
});

jest.mock('@brightchain/brightmail-lib', () => ({
  BrightMailStrings: new Proxy(
    {},
    { get: (_t: unknown, p: string | symbol) => String(p) },
  ),
}));

jest.mock('@brightchain/brightchain-react-components', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    BrightChainSubLogo: ({ subText }: { subText?: string }) => (
      <span data-testid="brightchain-sub-logo">{subText || 'SubLogo'}</span>
    ),
    LayoutShell: ({
      brandConfig,
      sidebar,
      toolbarActions,
      subBar,
      detailPanel,
      children,
    }: {
      brandConfig: {
        appName: string;
        logo?: React.ReactNode;
        primaryColor: string;
      };
      sidebar?: {
        items: { route: string; label: string; icon: React.ReactNode }[];
        header?: React.ReactNode;
        footer?: React.ReactNode;
        ariaLabel?: string;
        onNavigate?: (route: string) => void;
      };
      toolbarActions?: React.ReactNode;
      subBar?: React.ReactNode;
      detailPanel?: React.ReactNode;
      children?: React.ReactNode;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const useMediaQuery = require('@mui/material/useMediaQuery');
      const isDesktop = useMediaQuery('(min-width:961px)');
      const isWideDesktop = useMediaQuery('(min-width:1280px)');
      const [_sidebarOpen, setSidebarOpen] = React.useState(false);
      return (
        <div data-testid="layout-shell">
          <div data-testid="layout-appbar">
            {!isDesktop && sidebar && (
              <button
                aria-label="Toggle navigation"
                onClick={() => setSidebarOpen((p: boolean) => !p)}
                data-testid="layout-hamburger"
              />
            )}
            {brandConfig.logo || <span>{brandConfig.appName}</span>}
            {toolbarActions}
          </div>
          {subBar}
          <div style={{ display: 'flex' }}>
            {sidebar && (
              <div data-testid="app-sidebar-drawer">
                {sidebar.header}
                <ul role="menu" aria-label={sidebar.ariaLabel}>
                  {sidebar.items.map(
                    (item: {
                      route: string;
                      label: string;
                      icon: React.ReactNode;
                    }) => (
                      <li key={item.route} role="menuitem">
                        {item.icon}
                        <span>{item.label}</span>
                      </li>
                    ),
                  )}
                </ul>
                {sidebar.footer}
              </div>
            )}
            <main data-testid="layout-content-area">
              {children || <div data-testid="outlet">Outlet Content</div>}
            </main>
            {isWideDesktop && detailPanel && (
              <div data-testid="layout-detail-panel">{detailPanel}</div>
            )}
          </div>
        </div>
      );
    },
  };
});

jest.mock('@tiptap/react', () => ({
  useEditor: () => null,
  EditorContent: () => null,
}));
jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: { configure: jest.fn() },
}));
jest.mock('@tiptap/extension-underline', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@tiptap/extension-link', () => ({
  __esModule: true,
  default: { configure: jest.fn() },
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
    // Sidebar and AppBar both render the logo
    expect(
      screen.getAllByTestId('brightchain-sub-logo').length,
    ).toBeGreaterThanOrEqual(1);
    // Sidebar renders nav items
    expect(screen.getByText('Nav_Inbox')).toBeInTheDocument();
    expect(screen.getByText('Nav_Sent')).toBeInTheDocument();
    expect(screen.getByText('Nav_Drafts')).toBeInTheDocument();
    expect(screen.getByText('Nav_Trash')).toBeInTheDocument();
  });

  /**
   * Requirement 1.2: Hamburger icon appears on narrow viewports
   */
  it('shows hamburger toggle button on narrow viewports', () => {
    setBreakpoint('mobile');
    render(<BrightMailLayout />);
    const hamburger = screen.getByLabelText('Toggle navigation');
    expect(hamburger).toBeInTheDocument();
  });

  /**
   * Requirement 1.2: No hamburger on desktop
   */
  it('does not show hamburger on desktop viewports', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    expect(
      screen.queryByLabelText('Toggle navigation'),
    ).not.toBeInTheDocument();
  });

  /**
   * Requirement 1.6: Reading pane appears at ≥1280px
   */
  it('renders reading pane placeholder on wide desktop', () => {
    setBreakpoint('wide');
    render(<BrightMailLayout />);
    expect(screen.getByText('ReadingPane_Placeholder')).toBeInTheDocument();
  });

  /**
   * Requirement 1.6: Reading pane hidden below 1280px
   */
  it('does not render reading pane below 1280px', () => {
    setBreakpoint('desktop');
    render(<BrightMailLayout />);
    expect(
      screen.queryByText('ReadingPane_Placeholder'),
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
    expect(screen.getByLabelText('Nav_Compose')).toBeInTheDocument();
  });
});
