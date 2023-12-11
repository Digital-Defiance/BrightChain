/**
 * Bug Condition Exploration Test — BrightPassRoutes missing entries/new route
 *
 * This test encodes the EXPECTED (correct) behavior. It is written
 * BEFORE the fix and is EXPECTED TO FAIL on unfixed code, confirming
 * the bug exists.
 *
 * Bug 2b: No route exists for /brightpass/vault/:vaultId/entries/new
 *
 * **Validates: Requirements 1.3**
 */

import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────

// Mock express-suite-react-components (PrivateRoute just renders children)
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  PrivateRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuthenticatedApi: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  useAuth: () => ({
    admin: false,
    userData: null,
    isAuthenticated: true,
  }),
}));

// Mock all brightpass-react-components to simple stubs.
// This avoids transitive dependency issues with BrightPassProvider,
// useBrightPassApi, etc.
jest.mock('@brightchain/brightpass-react-components', () => ({
  BrightPassProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  BrightPassLayout: () => {
    // BrightPassLayout uses <Outlet /> to render child routes
    const { Outlet } = jest.requireActual('react-router-dom');
    return <Outlet />;
  },
  VaultListView: () => <div data-testid="vault-list-view">VaultListView</div>,
  VaultDetailView: () => (
    <div data-testid="vault-detail-view">VaultDetailView</div>
  ),
  AuditLogView: () => <div data-testid="audit-log-view">AuditLogView</div>,
  PasswordGeneratorPage: () => (
    <div data-testid="password-generator">PasswordGeneratorPage</div>
  ),
}));

// ── Import after mocks ──────────────────────────────────────────────

import BrightPassRoutes from './brightpass-routes';

// ── Tests ────────────────────────────────────────────────────────────

describe('Bug 2b: Missing route for vault/:vaultId/entries/new', () => {
  /**
   * Navigate to /brightpass/vault/test-id/entries/new and assert that
   * something renders (not blank).
   *
   * On unfixed code, no route is defined for this path, so nothing
   * meaningful renders — the test will FAIL.
   *
   * The BrightPassRoutes component renders inside a parent route at
   * /brightpass/*, so we set up the MemoryRouter accordingly.
   *
   * **Validates: Requirements 1.3**
   */
  it('should render a component at /brightpass/vault/test-id/entries/new', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/brightpass/vault/test-id/entries/new']}>
        <Routes>
          <Route path="/brightpass/*" element={<BrightPassRoutes />} />
        </Routes>
      </MemoryRouter>,
    );

    // On unfixed code, no route matches vault/:vaultId/entries/new.
    // The route tree will fall through and render nothing for this path.
    // We check that some meaningful content renders — specifically, we
    // should NOT see VaultListView (the index route) or VaultDetailView.
    // Instead, an entry creation component/placeholder should render.
    const textContent = container.textContent || '';

    // EXPECTED TO FAIL on unfixed code: no route matches entries/new,
    // so no entry creation content is rendered. The page will either be
    // blank or show the index route (VaultListView).
    const hasEntryCreationContent =
      textContent.includes('Entry') ||
      textContent.includes('entry') ||
      textContent.includes('Create') ||
      textContent.includes('New') ||
      textContent.includes('Placeholder');

    expect(hasEntryCreationContent).toBe(true);
  });
});
