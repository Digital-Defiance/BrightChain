/**
 * Property-based tests for BreadcrumbNav — Property 21: Breadcrumb route hierarchy
 *
 * **Validates: Requirements 14.3**
 *
 * For any route within the `/brightpass` hierarchy, the breadcrumb component
 * should render a sequence of links where each link corresponds to a parent
 * segment of the current route, ending with the current page as non-clickable
 * text (no `to` property).
 */

import fc from 'fast-check';

// Mock brightchain-lib to avoid the full initialization chain (GUID validation).
// We only need the BrightPassStrings constants used by buildBreadcrumbs.
jest.mock('@brightchain/brightchain-lib', () => ({
  BrightPassStrings: {
    Breadcrumb_BrightPass: 'Breadcrumb_BrightPass',
    Breadcrumb_VaultTemplate: 'Breadcrumb_VaultTemplate',
    Breadcrumb_AuditLog: 'Breadcrumb_AuditLog',
    Breadcrumb_PasswordGenerator: 'Breadcrumb_PasswordGenerator',
  },
}));

import { BreadcrumbItem, buildBreadcrumbs } from './BreadcrumbNav';

// ---------------------------------------------------------------------------
// Identity translation function — returns the key as-is
// ---------------------------------------------------------------------------
const identity: (key: string, vars?: Record<string, string>) => string = (
  key,
  vars,
) => {
  if (vars) {
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, v),
      key,
    );
  }
  return key;
};

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary UUID string for vault IDs. */
const arbUuid = fc.uuid();

/** Arbitrary vault name. */
const arbVaultName = fc.string({ minLength: 1, maxLength: 30 });

/**
 * Arbitrary valid BrightPass route with optional vault name.
 * Returns [pathname, optionalVaultName].
 */
const arbBrightPassRoute: fc.Arbitrary<[string, string | undefined]> = fc.oneof(
  // /brightpass (root)
  fc.constant(['/brightpass', undefined] as [string, string | undefined]),
  // /brightpass/vault/{uuid}
  fc
    .tuple(arbUuid, arbVaultName)
    .map(
      ([uuid, name]) =>
        [`/brightpass/vault/${uuid}`, name] as [string, string | undefined],
    ),
  // /brightpass/vault/{uuid}/audit
  fc
    .tuple(arbUuid, arbVaultName)
    .map(
      ([uuid, name]) =>
        [`/brightpass/vault/${uuid}/audit`, name] as [
          string,
          string | undefined,
        ],
    ),
  // /brightpass/tools/generator
  fc.constant(['/brightpass/tools/generator', undefined] as [
    string,
    string | undefined,
  ]),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 21: Breadcrumb route hierarchy', () => {
  /**
   * **Validates: Requirements 14.3**
   *
   * The last breadcrumb item has no `to` property (non-clickable current page).
   */
  it('last breadcrumb item has no `to` property', () => {
    fc.assert(
      fc.property(arbBrightPassRoute, ([pathname, vaultName]) => {
        const items = buildBreadcrumbs(pathname, identity, vaultName);
        expect(items.length).toBeGreaterThan(0);
        const last = items[items.length - 1];
        expect(last.to).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.3**
   *
   * All non-last items have a `to` property (clickable links).
   */
  it('all non-last items have a `to` property', () => {
    fc.assert(
      fc.property(arbBrightPassRoute, ([pathname, vaultName]) => {
        const items = buildBreadcrumbs(pathname, identity, vaultName);
        const allButLast = items.slice(0, -1);
        for (const item of allButLast) {
          expect(item.to).toBeDefined();
          expect(typeof item.to).toBe('string');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.3**
   *
   * Each `to` value is a prefix of the current pathname.
   */
  it('each `to` is a prefix of the current pathname', () => {
    fc.assert(
      fc.property(arbBrightPassRoute, ([pathname, vaultName]) => {
        const items = buildBreadcrumbs(pathname, identity, vaultName);
        const normalized = pathname.replace(/\/+$/, '');
        for (const item of items) {
          if (item.to) {
            expect(normalized.startsWith(item.to)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.3**
   *
   * Items are in hierarchical order: each `to` is a prefix of the next `to`.
   */
  it('items are in hierarchical order (each `to` is a prefix of the next)', () => {
    fc.assert(
      fc.property(arbBrightPassRoute, ([pathname, vaultName]) => {
        const items = buildBreadcrumbs(pathname, identity, vaultName);
        const withTo = items.filter(
          (item): item is BreadcrumbItem & { to: string } =>
            item.to !== undefined,
        );
        for (let i = 0; i < withTo.length - 1; i++) {
          expect(withTo[i + 1].to.startsWith(withTo[i].to)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 14.3**
   *
   * The first item always links to `/brightpass` (for multi-item breadcrumbs)
   * or represents the BrightPass root (for single-item at root route).
   */
  it('first item always links to `/brightpass`', () => {
    fc.assert(
      fc.property(arbBrightPassRoute, ([pathname, vaultName]) => {
        const items = buildBreadcrumbs(pathname, identity, vaultName);
        expect(items.length).toBeGreaterThan(0);
        if (items.length > 1) {
          // For deeper routes, first item is a clickable link to /brightpass
          expect(items[0].to).toBe('/brightpass');
        } else {
          // At root, the single item is the current page (no `to`)
          // but its label should still reference BrightPass
          expect(items[0].label).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
