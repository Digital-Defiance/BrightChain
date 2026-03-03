/**
 * Property-based tests for VaultListView — Property 3: Vault list item rendering completeness
 *
 * **Validates: Requirements 3.2, 9.5**
 *
 * Property 3: For any VaultMetadata object, the rendered vault list item should
 * contain the vault's name, a formatted creation date string, the shared member
 * count, and — if sharedWith.length > 0 — a shared icon indicator.
 */

import fc from 'fast-check';
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { VaultMetadata } from '@brightchain/brightchain-lib';

// ---------------------------------------------------------------------------
// Mocks — set up before importing the component under test.
// Mock @brightchain/brightchain-lib to avoid the full ECIES/GUID init chain.
// ---------------------------------------------------------------------------

jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const mockListVaults = jest.fn();

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    listVaults: (...args: unknown[]) => mockListVaults(...args),
    deleteVault: jest.fn(),
  }),
}));

jest.mock('../hooks/useBrightPassTranslation', () => ({
  __esModule: true,
  useBrightPassTranslation: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (vars) {
        return Object.entries(vars).reduce(
          (acc, [k, v]) => acc.replace(`{${k}}`, v),
          key,
        );
      }
      return key;
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/brightpass' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

jest.mock('../components/BreadcrumbNav', () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumb-nav" />,
}));

jest.mock('../components/CreateVaultDialog', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/MasterPasswordPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

import VaultListView from './VaultListView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formats a Date the same way VaultListView does. */
function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const HEX = '0123456789abcdef';

/** Build a 64-char hex string from a seed integer (fast, no regex). */
function seedToBlockId(seed: number): string {
  let result = '';
  let s = Math.abs(seed);
  for (let i = 0; i < 64; i++) {
    result += HEX[s % 16];
    s = Math.floor(s / 16) || i + 1;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Arbitraries — optimised for speed (no regex generation)
// ---------------------------------------------------------------------------

/**
 * Fast arbitrary for a vault name.
 * Starts with a letter to avoid collisions with numeric text elsewhere
 * in the rendered component (e.g. shared counts, entry counts).
 */
const arbVaultName = fc
  .string({ minLength: 2, maxLength: 20, unit: 'grapheme' })
  .filter((s) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s));

/** Fast arbitrary for a Date within a reasonable range. */
const arbDate = fc.date({
  min: new Date('2000-01-01T00:00:00Z'),
  max: new Date('2099-12-31T23:59:59Z'),
});

/** Fast arbitrary for a BlockId (derived from an integer seed). */
const arbBlockId = fc.integer().map(seedToBlockId);

/** Arbitrary for a single VaultMetadata object. */
const arbVaultMetadata: fc.Arbitrary<VaultMetadata> = fc
  .record({
    id: fc.uuid(),
    name: arbVaultName,
    ownerId: fc.uuid(),
    createdAt: arbDate,
    updatedAt: arbDate,
    entryCount: fc.nat({ max: 1000 }),
    sharedWith: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
    vcblBlockId: arbBlockId,
  })
  .map((v) => v as unknown as VaultMetadata);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 3: Vault list item rendering completeness', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 3.2, 9.5**
   *
   * For any VaultMetadata, the rendered list item contains the vault name
   * and a formatted creation date.
   */
  it('rendered vault item contains name and formatted creation date', async () => {
    await fc.assert(
      fc.asyncProperty(arbVaultMetadata, async (vault) => {
        cleanup();
        mockListVaults.mockResolvedValue([vault]);
        render(<VaultListView />);

        await waitFor(() => {
          expect(screen.getByText(vault.name)).toBeTruthy();
        });
        expect(screen.getByText(formatDate(vault.createdAt))).toBeTruthy();

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);

  /**
   * **Validates: Requirements 9.5**
   *
   * When sharedWith.length > 0, the rendered item displays the shared count
   * and a PeopleIcon.
   */
  it('displays shared count and icon when vault has shared members', async () => {
    const arbSharedVault = arbVaultMetadata.filter(
      (v) => v.sharedWith.length > 0,
    );

    await fc.assert(
      fc.asyncProperty(arbSharedVault, async (vault) => {
        cleanup();
        mockListVaults.mockResolvedValue([vault]);
        render(<VaultListView />);

        await waitFor(() => {
          expect(screen.getByText(vault.name)).toBeTruthy();
        });
        expect(
          screen.getByText(String(vault.sharedWith.length)),
        ).toBeTruthy();
        expect(screen.getByTestId('PeopleIcon')).toBeTruthy();

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);

  /**
   * **Validates: Requirements 9.5**
   *
   * When sharedWith is empty, no PeopleIcon or shared count is rendered.
   */
  it('does not display shared icon when vault has no shared members', async () => {
    const arbUnsharedVault = arbVaultMetadata.map((v) => ({
      ...v,
      sharedWith: [] as string[],
    }));

    await fc.assert(
      fc.asyncProperty(arbUnsharedVault, async (vault) => {
        cleanup();
        mockListVaults.mockResolvedValue([vault]);
        render(<VaultListView />);

        await waitFor(() => {
          expect(screen.getByText(vault.name)).toBeTruthy();
        });
        expect(screen.queryByTestId('PeopleIcon')).toBeNull();

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});
