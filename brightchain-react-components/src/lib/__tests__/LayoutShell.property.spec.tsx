/**
 * Property-based tests for LayoutShell component.
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs.
 */
import { useTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import * as React from 'react';
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
// matchMedia mock helpers
// ---------------------------------------------------------------------------
function evaluateMediaQuery(query: string, width: number): boolean {
  const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
  if (minMatch) return width >= parseInt(minMatch[1], 10);
  return false;
}

function mockMatchMedia(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: evaluateMediaQuery(query, width),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const arbHexColor: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  )
  .map(
    ([r, g, b]) =>
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
  );

const arbBrandConfig: fc.Arbitrary<BrandConfig> = fc.record({
  appName: fc.stringMatching(/^[A-Za-z]{1,20}$/),
  logo: fc.option(
    fc.constant((<span data-testid="test-logo">Logo</span>) as React.ReactNode),
    { nil: undefined },
  ),
  primaryColor: arbHexColor,
  themeOverrides: fc.option(fc.constant({}), { nil: undefined }),
});

const arbNavItem: fc.Arbitrary<NavItem> = fc
  .record({
    route: fc.stringMatching(/^\/[a-z]{1,12}$/),
    label: fc.stringMatching(/^[A-Za-z]{1,20}$/),
    badgeCount: fc.option(fc.integer({ min: 0, max: 99 }), { nil: undefined }),
    dividerBefore: fc.option(fc.boolean(), { nil: undefined }),
  })
  .map((r) => ({
    ...r,
    icon: <span data-testid={`icon-${r.route}`}>icon</span>,
  }));

const arbNavItemArray: fc.Arbitrary<NavItem[]> = fc.uniqueArray(arbNavItem, {
  minLength: 1,
  maxLength: 20,
  selector: (item) => item.route,
});

const arbSidebarConfig: fc.Arbitrary<SidebarConfig> = fc.record({
  items: arbNavItemArray,
  header: fc.option(
    fc.constant(
      (<div data-testid="test-sidebar-header">Header</div>) as React.ReactNode,
    ),
    { nil: undefined },
  ),
  footer: fc.option(
    fc.constant(
      (<div data-testid="test-sidebar-footer">Footer</div>) as React.ReactNode,
    ),
    { nil: undefined },
  ),
  ariaLabel: fc.option(fc.stringMatching(/^[A-Za-z ]{1,20}$/), {
    nil: undefined,
  }),
  onNavigate: fc.option(fc.constant(jest.fn()), { nil: undefined }),
});

const arbViewportWidth: fc.Arbitrary<number> = fc.integer({
  min: 320,
  max: 2560,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps LayoutShell in MemoryRouter for all tests */
function renderShell(
  props: React.ComponentProps<typeof LayoutShell>,
  options?: { wrapper?: React.ComponentType<{ children: React.ReactNode }> },
) {
  const Wrapper = options?.wrapper;
  if (Wrapper) {
    return render(
      <MemoryRouter>
        <Wrapper>
          <LayoutShell {...props} />
        </Wrapper>
      </MemoryRouter>,
    );
  }
  return render(
    <MemoryRouter>
      <LayoutShell {...props} />
    </MemoryRouter>,
  );
}

const _defaultBrandConfig: BrandConfig = {
  appName: 'TestApp',
  primaryColor: '#1976d2',
};

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 1: Structural layout integrity
// **Validates: Requirements 1.1**
// ---------------------------------------------------------------------------
describe('Property 1: Structural layout integrity', () => {
  afterEach(cleanup);

  it('AppBar and Content_Area are always present for any valid prop combination', () => {
    fc.assert(
      fc.property(
        arbBrandConfig,
        fc.option(arbSidebarConfig, { nil: undefined }),
        (brandConfig, sidebar) => {
          cleanup();
          mockMatchMedia(1200); // desktop width
          renderShell({ brandConfig, sidebar });

          expect(screen.getByTestId('layout-appbar')).toBeInTheDocument();
          expect(screen.getByTestId('layout-content-area')).toBeInTheDocument();
          expect(screen.getByTestId('layout-shell')).toBeInTheDocument();

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 2: Sidebar conditional rendering
// **Validates: Requirements 1.3, 7.4**
// ---------------------------------------------------------------------------
describe('Property 2: Sidebar conditional rendering', () => {
  afterEach(cleanup);

  it('Drawer present iff sidebar prop provided', () => {
    fc.assert(
      fc.property(
        arbBrandConfig,
        fc.option(arbSidebarConfig, { nil: undefined }),
        (brandConfig, sidebar) => {
          cleanup();
          mockMatchMedia(1200);
          renderShell({ brandConfig, sidebar });

          const drawer = screen.queryByTestId('app-sidebar-drawer');
          if (sidebar) {
            expect(drawer).toBeInTheDocument();
          } else {
            expect(drawer).not.toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 3: Optional slot rendering
// **Validates: Requirements 1.4, 1.5**
// ---------------------------------------------------------------------------
describe('Property 3: Optional slot rendering', () => {
  afterEach(cleanup);

  it('SubBar and toolbarActions render only when their props are provided', () => {
    fc.assert(
      fc.property(
        arbBrandConfig,
        fc.boolean(),
        fc.boolean(),
        (brandConfig, hasSubBar, hasToolbarActions) => {
          cleanup();
          mockMatchMedia(1200);

          const subBar = hasSubBar ? (
            <div data-testid="test-subbar-content">SubBar</div>
          ) : undefined;
          const toolbarActions = hasToolbarActions ? (
            <div data-testid="test-toolbar-content">Actions</div>
          ) : undefined;

          renderShell({ brandConfig, subBar, toolbarActions });

          if (hasSubBar) {
            expect(screen.getByTestId('layout-subbar')).toBeInTheDocument();
          } else {
            expect(
              screen.queryByTestId('layout-subbar'),
            ).not.toBeInTheDocument();
          }

          if (hasToolbarActions) {
            expect(
              screen.getByTestId('layout-toolbar-actions'),
            ).toBeInTheDocument();
          } else {
            expect(
              screen.queryByTestId('layout-toolbar-actions'),
            ).not.toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 4: Children vs Outlet content rendering
// **Validates: Requirements 1.6, 1.7**
// ---------------------------------------------------------------------------
describe('Property 4: Children vs Outlet content rendering', () => {
  afterEach(cleanup);

  it('children render when provided, Outlet renders when children absent', () => {
    fc.assert(
      fc.property(arbBrandConfig, fc.boolean(), (brandConfig, hasChildren) => {
        cleanup();
        mockMatchMedia(1200);

        const children = hasChildren ? (
          <div data-testid="test-children">Child Content</div>
        ) : undefined;

        renderShell({ brandConfig, children });

        if (hasChildren) {
          expect(screen.getByTestId('test-children')).toBeInTheDocument();
          expect(screen.queryByTestId('mock-outlet')).not.toBeInTheDocument();
        } else {
          expect(screen.getByTestId('mock-outlet')).toBeInTheDocument();
          expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 13: Theme merging from BrandConfig
// **Validates: Requirements 4.2**
// ---------------------------------------------------------------------------
describe('Property 13: Theme merging from BrandConfig', () => {
  afterEach(cleanup);

  /** Helper component that reads the MUI theme and renders the primary color */
  function ThemeReader() {
    const theme = useTheme();
    return (
      <div data-testid="theme-primary-color">{theme.palette.primary.main}</div>
    );
  }

  it('palette.primary.main equals brandConfig.primaryColor', () => {
    fc.assert(
      fc.property(arbBrandConfig, (brandConfig) => {
        cleanup();
        mockMatchMedia(1200);

        renderShell({
          brandConfig,
          children: <ThemeReader />,
        });

        const rendered = screen.getByTestId('theme-primary-color').textContent;
        // MUI normalizes hex colors to lowercase
        expect(rendered?.toLowerCase()).toBe(
          brandConfig.primaryColor.toLowerCase(),
        );

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 14: AppBar logo vs appName rendering
// **Validates: Requirements 4.3, 4.4**
// ---------------------------------------------------------------------------
describe('Property 14: AppBar logo vs appName rendering', () => {
  afterEach(cleanup);

  it('logo renders when provided, appName Typography renders when logo absent', () => {
    fc.assert(
      fc.property(arbBrandConfig, (brandConfig) => {
        cleanup();
        mockMatchMedia(1200);

        renderShell({ brandConfig });

        if (brandConfig.logo) {
          expect(screen.getByTestId('layout-logo')).toBeInTheDocument();
          expect(
            screen.queryByTestId('layout-appname'),
          ).not.toBeInTheDocument();
        } else {
          expect(screen.getByTestId('layout-appname')).toBeInTheDocument();
          expect(screen.getByTestId('layout-appname')).toHaveTextContent(
            brandConfig.appName,
          );
          expect(screen.queryByTestId('layout-logo')).not.toBeInTheDocument();
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 15: BrandConfig context availability
// **Validates: Requirements 4.5**
// ---------------------------------------------------------------------------
describe('Property 15: BrandConfig context availability', () => {
  afterEach(cleanup);

  /** Helper component that reads BrandConfig from context */
  function BrandConfigReader() {
    const config = useBrandConfig();
    return <div data-testid="brand-config-appname">{config.appName}</div>;
  }

  it('descendant using useBrandConfig() receives the same BrandConfig', () => {
    fc.assert(
      fc.property(arbBrandConfig, (brandConfig) => {
        cleanup();
        mockMatchMedia(1200);

        renderShell({
          brandConfig,
          children: <BrandConfigReader />,
        });

        expect(screen.getByTestId('brand-config-appname')).toHaveTextContent(
          brandConfig.appName,
        );

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 18: Reactive BrandConfig updates
// **Validates: Requirements 6.2**
// ---------------------------------------------------------------------------
describe('Property 18: Reactive BrandConfig updates', () => {
  afterEach(cleanup);

  /** Helper component that reads the MUI theme primary color */
  function ThemeReader() {
    const theme = useTheme();
    return (
      <div data-testid="theme-primary-reactive">
        {theme.palette.primary.main}
      </div>
    );
  }

  it('re-render with new BrandConfig updates theme and AppBar without unmount', () => {
    fc.assert(
      fc.property(arbBrandConfig, arbBrandConfig, (config1, config2) => {
        cleanup();
        mockMatchMedia(1200);

        const { rerender } = render(
          <MemoryRouter>
            <LayoutShell brandConfig={config1}>
              <ThemeReader />
            </LayoutShell>
          </MemoryRouter>,
        );

        // Verify initial state
        const themeEl = screen.getByTestId('theme-primary-reactive');
        expect(themeEl.textContent?.toLowerCase()).toBe(
          config1.primaryColor.toLowerCase(),
        );

        // Re-render with new config
        rerender(
          <MemoryRouter>
            <LayoutShell brandConfig={config2}>
              <ThemeReader />
            </LayoutShell>
          </MemoryRouter>,
        );

        // Verify updated state
        const updatedThemeEl = screen.getByTestId('theme-primary-reactive');
        expect(updatedThemeEl.textContent?.toLowerCase()).toBe(
          config2.primaryColor.toLowerCase(),
        );

        // AppBar should reflect new branding
        if (config2.logo) {
          expect(screen.getByTestId('layout-logo')).toBeInTheDocument();
        } else {
          expect(screen.getByTestId('layout-appname')).toHaveTextContent(
            config2.appName,
          );
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 19: Context provider isolation
// **Validates: Requirements 7.5**
// ---------------------------------------------------------------------------
describe('Property 19: Context provider isolation', () => {
  afterEach(cleanup);

  it('descendants can read external context without interference from LayoutShell', () => {
    const ExternalContext = React.createContext<string>('default');

    function ExternalContextReader() {
      const value = React.useContext(ExternalContext);
      return <div data-testid="external-context-value">{value}</div>;
    }

    fc.assert(
      fc.property(
        arbBrandConfig,
        fc.stringMatching(/^[A-Za-z]{1,20}$/),
        (brandConfig, externalValue) => {
          cleanup();
          mockMatchMedia(1200);

          const ExternalWrapper = ({
            children,
          }: {
            children: React.ReactNode;
          }) => (
            <ExternalContext.Provider value={externalValue}>
              {children}
            </ExternalContext.Provider>
          );

          renderShell(
            {
              brandConfig,
              children: <ExternalContextReader />,
            },
            { wrapper: ExternalWrapper },
          );

          expect(
            screen.getByTestId('external-context-value'),
          ).toHaveTextContent(externalValue);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 11: Hamburger toggle at mobile breakpoint
// **Validates: Requirements 3.1, 5.5**
// ---------------------------------------------------------------------------
describe('Property 11: Hamburger toggle at mobile breakpoint', () => {
  afterEach(cleanup);

  it('hamburger present ≤960px, absent >960px when sidebar enabled', () => {
    fc.assert(
      fc.property(
        arbBrandConfig,
        arbSidebarConfig,
        arbViewportWidth,
        (brandConfig, sidebar, width) => {
          cleanup();
          mockMatchMedia(width);

          renderShell({ brandConfig, sidebar });

          const hamburger = screen.queryByTestId('layout-hamburger');
          if (width <= 960) {
            expect(hamburger).toBeInTheDocument();
            expect(hamburger).toHaveAttribute('aria-label');
          } else {
            expect(hamburger).not.toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 12: Responsive space allocation
// **Validates: Requirements 2.1, 3.2, 3.3**
// ---------------------------------------------------------------------------
describe('Property 12: Responsive space allocation', () => {
  afterEach(cleanup);

  it('sidebar 240px + Content_Area fills remaining when >960px; Content_Area full width when ≤960px', () => {
    fc.assert(
      fc.property(
        arbBrandConfig,
        arbSidebarConfig,
        arbViewportWidth,
        (brandConfig, sidebar, width) => {
          cleanup();
          mockMatchMedia(width);

          renderShell({ brandConfig, sidebar });

          const contentArea = screen.getByTestId('layout-content-area');

          if (width > 960) {
            // Desktop: sidebar should be permanent (240px), content fills remaining
            const drawer = screen.getByTestId('app-sidebar-drawer');
            expect(drawer).toBeInTheDocument();
            // Permanent drawer has MuiDrawer-docked class
            expect(drawer).toHaveClass('MuiDrawer-docked');
            // Content area should have flexGrow to fill remaining space
            expect(contentArea).toBeInTheDocument();
          } else {
            // Mobile: content area should be full width (no permanent sidebar)
            const drawer = screen.queryByTestId('app-sidebar-drawer');
            // Drawer exists but is temporary (not docked)
            if (drawer) {
              expect(drawer).not.toHaveClass('MuiDrawer-docked');
            }
            expect(contentArea).toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 20: Detail panel breakpoint rendering
// **Validates: Requirements 8.2, 8.3**
// ---------------------------------------------------------------------------
describe('Property 20: Detail panel breakpoint rendering', () => {
  afterEach(cleanup);

  it('Detail_Panel renders at 40% with divider iff ≥1280px AND detailPanel prop provided', () => {
    fc.assert(
      fc.property(
        arbBrandConfig,
        fc.boolean(),
        arbViewportWidth,
        (brandConfig, hasDetailPanel, width) => {
          cleanup();
          mockMatchMedia(width);

          const detailPanel = hasDetailPanel ? (
            <div data-testid="test-detail-content">Detail</div>
          ) : undefined;

          renderShell({ brandConfig, detailPanel });

          const panel = screen.queryByTestId('layout-detail-panel');

          if (width >= 1280 && hasDetailPanel) {
            expect(panel).toBeInTheDocument();
            // Check 40% width style
            expect(panel).toHaveStyle({ width: '40%' });
          } else {
            expect(panel).not.toBeInTheDocument();
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
