/**
 * Property-based tests for AppSidebar component.
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs.
 */
import '@testing-library/jest-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { AppSidebar } from '../layout/AppSidebar';
import { NavItem } from '../layout/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

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

const arbViewportWidth: fc.Arbitrary<number> = fc.integer({
  min: 320,
  max: 2560,
});

const arbFocusIndex = (n: number): fc.Arbitrary<number> =>
  fc.integer({ min: 0, max: n - 1 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  open: true,
  onToggle: jest.fn(),
  variant: 'permanent' as const,
  activeRoute: '/__none__',
  ariaLabel: 'Test Navigation',
};

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 6: NavItem rendering completeness
// **Validates: Requirements 2.4**
// ---------------------------------------------------------------------------
describe('Property 6: NavItem rendering completeness', () => {
  it('each NavItem renders icon, label, and Badge only when badgeCount > 0', () => {
    fc.assert(
      fc.property(arbNavItemArray, (items) => {
        cleanup();
        const { container } = render(
          <AppSidebar {...defaultProps} items={items} />,
        );

        // Every item should produce a ListItemButton
        const buttons = container.querySelectorAll('[role="menuitem"]');
        expect(buttons.length).toBe(items.length);

        items.forEach((item) => {
          // Icon present
          expect(screen.getByTestId(`icon-${item.route}`)).toBeInTheDocument();

          // Label present (scoped to nav item to handle duplicate labels)
          const navItem = screen.getByTestId(`nav-item-${item.route}`);
          expect(navItem).toHaveTextContent(item.label);

          // Badge visible only when badgeCount > 0
          const badge = navItem.querySelector('.MuiBadge-badge');
          if (item.badgeCount && item.badgeCount > 0) {
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveTextContent(String(item.badgeCount));
          } else {
            expect(badge).not.toBeInTheDocument();
          }
        });

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 7: Sidebar header and footer slot rendering
// **Validates: Requirements 2.5, 2.6**
// ---------------------------------------------------------------------------
describe('Property 7: Sidebar header and footer slot rendering', () => {
  it('header renders above nav list when provided, footer renders below', () => {
    fc.assert(
      fc.property(
        arbNavItemArray,
        fc.boolean(),
        fc.boolean(),
        (items, hasHeader, hasFooter) => {
          cleanup();
          const header = hasHeader ? (
            <div data-testid="test-header">Header</div>
          ) : undefined;
          const footer = hasFooter ? (
            <div data-testid="test-footer">Footer</div>
          ) : undefined;

          render(
            <AppSidebar
              {...defaultProps}
              items={items}
              header={header}
              footer={footer}
            />,
          );

          if (hasHeader) {
            const headerEl = screen.getByTestId('sidebar-header');
            const navList = screen.getByTestId('sidebar-nav-list');
            expect(headerEl).toBeInTheDocument();
            // Header should come before nav list in DOM order
            expect(
              headerEl.compareDocumentPosition(navList) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
          } else {
            expect(
              screen.queryByTestId('sidebar-header'),
            ).not.toBeInTheDocument();
          }

          if (hasFooter) {
            const footerEl = screen.getByTestId('sidebar-footer');
            const navList = screen.getByTestId('sidebar-nav-list');
            expect(footerEl).toBeInTheDocument();
            // Footer should come after nav list in DOM order
            expect(
              navList.compareDocumentPosition(footerEl) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
          } else {
            expect(
              screen.queryByTestId('sidebar-footer'),
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
// Feature: shared-dapp-layout, Property 8: DividerBefore rendering
// **Validates: Requirements 2.7**
// ---------------------------------------------------------------------------
describe('Property 8: DividerBefore rendering', () => {
  it('MUI Divider appears before each NavItem with dividerBefore: true', () => {
    fc.assert(
      fc.property(arbNavItemArray, (items) => {
        cleanup();
        render(<AppSidebar {...defaultProps} items={items} />);

        items.forEach((item) => {
          const dividerTestId = `divider-before-${item.route}`;
          if (item.dividerBefore) {
            const divider = screen.getByTestId(dividerTestId);
            expect(divider).toBeInTheDocument();
            // Divider should appear before the nav item in DOM order
            const navItem = screen.getByTestId(`nav-item-${item.route}`);
            expect(
              divider.compareDocumentPosition(navItem) &
                Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
          } else {
            expect(screen.queryByTestId(dividerTestId)).not.toBeInTheDocument();
          }
        });

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 9: Active route highlighting
// **Validates: Requirements 2.8**
// ---------------------------------------------------------------------------
describe('Property 9: Active route highlighting', () => {
  it('exactly one item has selected state matching the active route', () => {
    fc.assert(
      fc.property(
        arbNavItemArray.chain((items) =>
          fc
            .integer({ min: 0, max: items.length - 1 })
            .map((idx) => ({ items, activeIdx: idx })),
        ),
        ({ items, activeIdx }) => {
          cleanup();
          const activeRoute = items[activeIdx].route;

          const { container } = render(
            <AppSidebar
              {...defaultProps}
              items={items}
              activeRoute={activeRoute}
            />,
          );

          const allButtons = container.querySelectorAll('[role="menuitem"]');
          let selectedCount = 0;

          allButtons.forEach((btn) => {
            if (btn.classList.contains('Mui-selected')) {
              selectedCount++;
            }
          });

          // Exactly one item should be selected
          expect(selectedCount).toBe(1);

          // The correct item should be selected
          const activeButton = screen.getByTestId(`nav-item-${activeRoute}`);
          expect(activeButton).toHaveClass('Mui-selected');

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 10: Temporary drawer closes on navigation
// **Validates: Requirements 2.9**
// ---------------------------------------------------------------------------
describe('Property 10: Temporary drawer closes on navigation', () => {
  it('onToggle is called after nav item click when variant is temporary', () => {
    fc.assert(
      fc.property(
        arbNavItemArray.chain((items) =>
          fc
            .integer({ min: 0, max: items.length - 1 })
            .map((idx) => ({ items, clickIdx: idx })),
        ),
        ({ items, clickIdx }) => {
          cleanup();
          const onToggle = jest.fn();

          render(
            <AppSidebar
              {...defaultProps}
              variant="temporary"
              items={items}
              onToggle={onToggle}
            />,
          );

          const clickedItem = screen.getByTestId(
            `nav-item-${items[clickIdx].route}`,
          );
          fireEvent.click(clickedItem);

          expect(onToggle).toHaveBeenCalledTimes(1);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 17: Keyboard navigation wrapping
// **Validates: Requirements 5.2, 5.3**
// ---------------------------------------------------------------------------
describe('Property 17: Keyboard navigation wrapping', () => {
  it('ArrowDown moves to (i+1) mod N, ArrowUp moves to (i-1+N) mod N', () => {
    fc.assert(
      fc.property(
        arbNavItemArray.chain((items) =>
          arbFocusIndex(items.length).map((idx) => ({ items, focusIdx: idx })),
        ),
        ({ items, focusIdx }) => {
          cleanup();
          const n = items.length;

          render(<AppSidebar {...defaultProps} items={items} />);

          const focusedItem = screen.getByTestId(
            `nav-item-${items[focusIdx].route}`,
          );

          // Test ArrowDown: should move focus to (focusIdx + 1) % n
          const expectedDownIdx = (focusIdx + 1) % n;
          fireEvent.keyDown(focusedItem, { key: 'ArrowDown' });
          const expectedDownItem = screen.getByTestId(
            `nav-item-${items[expectedDownIdx].route}`,
          );
          expect(document.activeElement).toBe(expectedDownItem);

          // Test ArrowUp from the new position: should go back to focusIdx
          fireEvent.keyDown(expectedDownItem, { key: 'ArrowUp' });
          expect(document.activeElement).toBe(focusedItem);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 16: ARIA roles and attributes
// **Validates: Requirements 5.1, 5.4**
// ---------------------------------------------------------------------------
describe('Property 16: ARIA roles and attributes', () => {
  it('nav list has role="menu" and aria-label, each item has role="menuitem"', () => {
    fc.assert(
      fc.property(arbNavItemArray, (items) => {
        cleanup();
        render(<AppSidebar {...defaultProps} items={items} />);

        // Nav list should have role="menu" and aria-label
        const navList = screen.getByRole('menu');
        expect(navList).toBeInTheDocument();
        expect(navList).toHaveAttribute('aria-label', 'Test Navigation');

        // Each item should have role="menuitem"
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBe(items.length);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Feature: shared-dapp-layout, Property 5: Sidebar drawer variant by breakpoint
// **Validates: Requirements 2.2, 2.3**
// ---------------------------------------------------------------------------
describe('Property 5: Sidebar drawer variant by breakpoint', () => {
  it('renders permanent drawer when variant prop is permanent, temporary when temporary', () => {
    const items: NavItem[] = [
      {
        route: '/test',
        label: 'Test',
        icon: <span>icon</span>,
      },
    ];

    fc.assert(
      fc.property(arbViewportWidth, (width) => {
        cleanup();
        // Determine expected variant based on viewport width
        const expectedVariant = width > 960 ? 'permanent' : 'temporary';

        render(
          <AppSidebar
            {...defaultProps}
            variant={expectedVariant}
            items={items}
          />,
        );

        const drawer = screen.getByTestId('app-sidebar-drawer');

        // MUI Drawer applies MuiDrawer-docked class on the root element for permanent variant
        if (expectedVariant === 'permanent') {
          expect(drawer).toHaveClass('MuiDrawer-docked');
        } else {
          // Temporary drawer uses MuiDrawer-modal instead of docked
          expect(drawer).not.toHaveClass('MuiDrawer-docked');
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
