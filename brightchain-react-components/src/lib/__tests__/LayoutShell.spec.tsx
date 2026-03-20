/**
 * Unit tests for LayoutShell component.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 4.2, 4.5
 */
import { useTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useBrandConfig } from '../layout/BrandConfigContext';
import { LayoutShell } from '../layout/LayoutShell';
import { BrandConfig, NavItem, SidebarConfig } from '../layout/types';

// ---------------------------------------------------------------------------
// Mock Outlet so we can detect its presence
// ---------------------------------------------------------------------------
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="mock-outlet">Outlet</div>,
  };
});

// ---------------------------------------------------------------------------
// matchMedia mock helper
// ---------------------------------------------------------------------------
function mockMatchMedia(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => {
      const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
      const matches = minMatch ? width >= parseInt(minMatch[1], 10) : false;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const minimalBrandConfig: BrandConfig = {
  appName: 'TestApp',
  primaryColor: '#1976d2',
};

const navItems: NavItem[] = [
  {
    route: '/inbox',
    label: 'Inbox',
    icon: <span data-testid="icon-inbox">📥</span>,
    badgeCount: 3,
  },
  {
    route: '/sent',
    label: 'Sent',
    icon: <span data-testid="icon-sent">📤</span>,
  },
];

const fullSidebarConfig: SidebarConfig = {
  items: navItems,
  header: <div data-testid="test-sidebar-header">Sidebar Header</div>,
  footer: <div data-testid="test-sidebar-footer">Sidebar Footer</div>,
  ariaLabel: 'Main navigation',
  onNavigate: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test 1: renders with minimal props (brandConfig only, no sidebar)
// Validates: Requirements 1.1, 1.2
// ---------------------------------------------------------------------------
describe('LayoutShell with minimal props', () => {
  afterEach(cleanup);

  it('renders AppBar, Content_Area, and appName with no sidebar', () => {
    mockMatchMedia(1200);
    render(
      <MemoryRouter>
        <LayoutShell brandConfig={minimalBrandConfig} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('layout-shell')).toBeInTheDocument();
    expect(screen.getByTestId('layout-appbar')).toBeInTheDocument();
    expect(screen.getByTestId('layout-content-area')).toBeInTheDocument();
    expect(screen.getByTestId('layout-appname')).toHaveTextContent('TestApp');
    // No sidebar rendered
    expect(screen.queryByTestId('app-sidebar-drawer')).not.toBeInTheDocument();
    // No subbar, toolbar actions, or detail panel
    expect(screen.queryByTestId('layout-subbar')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('layout-toolbar-actions'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('layout-detail-panel')).not.toBeInTheDocument();
    // Outlet renders by default when no children
    expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Test 2: renders with all optional props provided
// Validates: Requirements 1.1, 1.2, 1.3
// ---------------------------------------------------------------------------
describe('LayoutShell with all optional props', () => {
  afterEach(cleanup);

  it('renders sidebar, subBar, toolbarActions, detailPanel, and children', () => {
    mockMatchMedia(1400); // wide desktop to show detail panel

    const fullBrandConfig: BrandConfig = {
      appName: 'FullApp',
      logo: <span data-testid="custom-logo">Logo</span>,
      primaryColor: '#ff5722',
    };

    render(
      <MemoryRouter>
        <LayoutShell
          brandConfig={fullBrandConfig}
          sidebar={fullSidebarConfig}
          subBar={<div data-testid="test-subbar">SubBar Content</div>}
          toolbarActions={<button data-testid="test-action">Action</button>}
          detailPanel={<div data-testid="test-detail">Detail Content</div>}
        >
          <div data-testid="test-children">Page Content</div>
        </LayoutShell>
      </MemoryRouter>,
    );

    // Shell structure
    expect(screen.getByTestId('layout-shell')).toBeInTheDocument();
    expect(screen.getByTestId('layout-appbar')).toBeInTheDocument();
    expect(screen.getByTestId('layout-content-area')).toBeInTheDocument();

    // Logo renders instead of appName
    expect(screen.getByTestId('layout-logo')).toBeInTheDocument();
    expect(screen.queryByTestId('layout-appname')).not.toBeInTheDocument();

    // Sidebar
    expect(screen.getByTestId('app-sidebar-drawer')).toBeInTheDocument();

    // SubBar
    expect(screen.getByTestId('layout-subbar')).toBeInTheDocument();
    expect(screen.getByTestId('test-subbar')).toHaveTextContent(
      'SubBar Content',
    );

    // Toolbar actions
    expect(screen.getByTestId('layout-toolbar-actions')).toBeInTheDocument();
    expect(screen.getByTestId('test-action')).toBeInTheDocument();

    // Detail panel (wide desktop)
    expect(screen.getByTestId('layout-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('test-detail')).toHaveTextContent(
      'Detail Content',
    );

    // Children render instead of Outlet
    expect(screen.getByTestId('test-children')).toHaveTextContent(
      'Page Content',
    );
    expect(screen.queryByTestId('mock-outlet')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Test 3: useBrandConfig() throws when used outside LayoutShell
// Validates: Requirements 4.5
// ---------------------------------------------------------------------------
describe('useBrandConfig() outside LayoutShell', () => {
  it('throws a descriptive error', () => {
    // Suppress React error boundary console noise
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    function NakedConsumer() {
      const config = useBrandConfig();
      return <div>{config.appName}</div>;
    }

    expect(() => {
      render(<NakedConsumer />);
    }).toThrow('useBrandConfig must be used within a LayoutShell');

    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Test 4: hamburger button toggles sidebar open/closed state
// Validates: Requirements 1.3
// ---------------------------------------------------------------------------
describe('Hamburger toggle', () => {
  afterEach(cleanup);

  it('toggles sidebar open and closed on mobile', () => {
    mockMatchMedia(800); // mobile viewport

    render(
      <MemoryRouter>
        <LayoutShell
          brandConfig={minimalBrandConfig}
          sidebar={fullSidebarConfig}
        >
          <div>Content</div>
        </LayoutShell>
      </MemoryRouter>,
    );

    // Hamburger should be visible on mobile
    const hamburger = screen.getByTestId('layout-hamburger');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toHaveAttribute('aria-label');

    // Click hamburger to open the sidebar
    fireEvent.click(hamburger);

    // After opening, the drawer should be in the DOM and not hidden
    const drawer = screen.getByTestId('app-sidebar-drawer');
    expect(drawer).toBeInTheDocument();
    expect(drawer).not.toHaveAttribute('aria-hidden', 'true');

    // Click hamburger again to close
    fireEvent.click(hamburger);

    // After closing, the drawer should be marked hidden
    expect(drawer).toHaveAttribute('aria-hidden', 'true');
  });
});

// ---------------------------------------------------------------------------
// Test 5: BrandConfig with themeOverrides that override primaryColor
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------
describe('themeOverrides override primaryColor', () => {
  afterEach(cleanup);

  /** Helper that reads the resolved MUI theme primary color */
  function ThemeInspector() {
    const theme = useTheme();
    return <div data-testid="theme-primary">{theme.palette.primary.main}</div>;
  }

  it('themeOverrides palette.primary.main wins over primaryColor', () => {
    mockMatchMedia(1200);

    const brandConfigWithOverride: BrandConfig = {
      appName: 'OverrideApp',
      primaryColor: '#0000ff', // blue
      themeOverrides: {
        palette: {
          primary: { main: '#ff0000' }, // red override
        },
      },
    };

    render(
      <MemoryRouter>
        <LayoutShell brandConfig={brandConfigWithOverride}>
          <ThemeInspector />
        </LayoutShell>
      </MemoryRouter>,
    );

    // The override (#ff0000) should win over primaryColor (#0000ff)
    const primaryColor = screen.getByTestId('theme-primary').textContent;
    expect(primaryColor?.toLowerCase()).toBe('#ff0000');
  });
});
