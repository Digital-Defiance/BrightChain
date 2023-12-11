/**
 * Preservation Property Tests — Existing Route Rendering
 *
 * These tests observe and lock-in EXISTING route behavior on UNFIXED code.
 * All tests MUST PASS on unfixed code to confirm baseline behavior
 * that must be preserved after the bugfix.
 *
 * Preservation C: Existing route rendering (Req 3.3, 3.4, 3.5)
 *
 * **Validates: Requirements 3.3, 3.4, 3.5**
 */

import { render } from '@testing-library/react';
import fc from 'fast-check';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ── Mocks ────────────────────────────────────────────────────────────

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

jest.mock('@brightchain/brightpass-react-components', () => ({
  BrightPassProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  BrightPassLayout: () => {
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

// ── Arbitraries ─────────────────────────────────────────────────────

/** Arbitrary vault ID: alphanumeric with hyphens, like UUIDs or short IDs. */
const arbVaultId: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-z0-9][a-z0-9-]{2,20}$/,
);

// ── Tests ────────────────────────────────────────────────────────────

describe('Preservation C — Existing route rendering (Req 3.3, 3.4, 3.5)', () => {
  /**
   * **Validates: Requirements 3.3**
   *
   * For all generated vaultId strings, /brightpass/vault/:vaultId
   * renders VaultDetailView.
   */
  it('vault detail route renders VaultDetailView for any vaultId', () => {
    fc.assert(
      fc.property(arbVaultId, (vaultId) => {
        const { container, unmount } = render(
          <MemoryRouter initialEntries={[`/brightpass/vault/${vaultId}`]}>
            <Routes>
              <Route path="/brightpass/*" element={<BrightPassRoutes />} />
            </Routes>
          </MemoryRouter>,
        );

        const textContent = container.textContent || '';
        expect(textContent).toContain('VaultDetailView');

        unmount();
      }),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * For all generated vaultId strings, /brightpass/vault/:vaultId/audit
   * renders AuditLogView.
   */
  it('audit route renders AuditLogView for any vaultId', () => {
    fc.assert(
      fc.property(arbVaultId, (vaultId) => {
        const { container, unmount } = render(
          <MemoryRouter initialEntries={[`/brightpass/vault/${vaultId}/audit`]}>
            <Routes>
              <Route path="/brightpass/*" element={<BrightPassRoutes />} />
            </Routes>
          </MemoryRouter>,
        );

        const textContent = container.textContent || '';
        expect(textContent).toContain('AuditLogView');

        unmount();
      }),
      { numRuns: 20 },
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * /brightpass/tools/generator renders PasswordGeneratorPage.
   */
  it('tools/generator route renders PasswordGeneratorPage', () => {
    const { container, unmount } = render(
      <MemoryRouter initialEntries={['/brightpass/tools/generator']}>
        <Routes>
          <Route path="/brightpass/*" element={<BrightPassRoutes />} />
        </Routes>
      </MemoryRouter>,
    );

    const textContent = container.textContent || '';
    expect(textContent).toContain('PasswordGeneratorPage');

    unmount();
  });
});
