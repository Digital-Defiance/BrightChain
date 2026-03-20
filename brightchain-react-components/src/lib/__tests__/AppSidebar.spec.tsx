/**
 * Unit tests for AppSidebar component.
 *
 * Validates: Requirements 2.1, 2.4, 7.2
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { AppSidebar } from '../layout/AppSidebar';
import { AppSidebarProps, NavItem } from '../layout/types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
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

const defaultProps: AppSidebarProps = {
  open: true,
  onToggle: jest.fn(),
  variant: 'permanent',
  activeRoute: '/inbox',
  items: navItems,
};

// ---------------------------------------------------------------------------
// Test 1: renders standalone outside of LayoutShell
// Validates: Requirements 2.1, 2.4
// ---------------------------------------------------------------------------
describe('AppSidebar standalone rendering', () => {
  it('renders the drawer and nav items without LayoutShell wrapper', () => {
    render(<AppSidebar {...defaultProps} />);

    expect(screen.getByTestId('app-sidebar-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-list')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-/inbox')).toBeInTheDocument();
    expect(screen.getByTestId('nav-item-/sent')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Test 2: empty NavItem array renders sidebar with no list items
// Validates: Requirements 2.4
// ---------------------------------------------------------------------------
describe('AppSidebar with empty items', () => {
  it('renders the drawer and nav list but no list items', () => {
    render(<AppSidebar {...defaultProps} items={[]} />);

    expect(screen.getByTestId('app-sidebar-drawer')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-nav-list')).toBeInTheDocument();
    // No nav items rendered
    const list = screen.getByTestId('sidebar-nav-list');
    expect(list.querySelectorAll('[role="menuitem"]')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Test 3: exports are available from brightchain-react-components package index
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------
describe('Package barrel exports', () => {
  it('exports AppSidebar, LayoutShell, BrandConfigContext, and useBrandConfig from layout barrel', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const layout = require('../layout');

    expect(layout.AppSidebar).toBeDefined();
    expect(layout.LayoutShell).toBeDefined();
    expect(layout.BrandConfigContext).toBeDefined();
    expect(layout.useBrandConfig).toBeDefined();
  });
});
