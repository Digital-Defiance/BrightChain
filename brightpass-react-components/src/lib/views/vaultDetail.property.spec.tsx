/**
 * Property-based tests for VaultDetailView and EntryDetailView
 *
 * **Property 4: Entry list rendering completeness**
 * **Property 5: Sensitive field masking**
 * **Property 7: Client-side entry filtering**
 *
 * **Validates: Requirements 4.1, 4.2, 4.4, 5.1, 5.3, 5.4**
 */

import fc from 'fast-check';
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type {
  CreditCardEntry,
  EntryPropertyRecord,
  LoginEntry,
  VaultEntryType,
} from '@brightchain/brightchain-lib';

// ---------------------------------------------------------------------------
// Mocks — must be set up before importing components under test.
// ---------------------------------------------------------------------------

jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

const mockGetEntry = jest.fn();
const mockCheckBreach = jest.fn();

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    getEntry: (...args: unknown[]) => mockGetEntry(...args),
    checkBreach: (...args: unknown[]) => mockCheckBreach(...args),
    deleteEntry: jest.fn(),
    searchEntries: jest.fn(),
  }),
}));

const stableT = (key: string, vars?: Record<string, string>) => {
  if (vars) {
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(`{${k}}`, v),
      key,
    );
  }
  return key;
};

jest.mock('../hooks/useBrightPassTranslation', () => ({
  __esModule: true,
  useBrightPassTranslation: () => ({
    t: stableT,
  }),
}));

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => jest.fn(),
  useParams: () => ({ vaultId: 'test-vault-id' }),
  useLocation: () => ({ pathname: '/brightpass/vault/test-vault-id' }),
  Link: ({
    children,
    to,
  }: {
    children: React.ReactNode;
    to: string;
  }) => <a href={to}>{children}</a>,
}));

const mockUseBrightPass = jest.fn();

jest.mock('../context/BrightPassProvider', () => ({
  __esModule: true,
  useBrightPass: () => mockUseBrightPass(),
}));

jest.mock('../components/BreadcrumbNav', () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumb-nav" />,
}));

jest.mock('../components/MasterPasswordPrompt', () => ({
  __esModule: true,
  default: () => null,
}));

// Import components and functions under test AFTER mocks
import VaultDetailView from './VaultDetailView';
import EntryDetailView from '../components/EntryDetailView';
import { filterEntries } from '../components/SearchBar';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const ENTRY_TYPES: VaultEntryType[] = [
  'login',
  'secure_note',
  'credit_card',
  'identity',
];

/** Arbitrary for a safe alphanumeric string. */
const arbSafeString: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-z][a-z0-9]{1,12}$/,
);

/** Arbitrary for a tag string. */
const arbTag: fc.Arbitrary<string> = arbSafeString;

/** Arbitrary for a site URL. */
const arbSiteUrl: fc.Arbitrary<string> = arbSafeString.map(
  (s) => `https://${s}.example.com`,
);

/** Arbitrary for a Date within a reasonable range. */
const arbDate = fc.date({
  min: new Date('2000-01-01T00:00:00Z'),
  max: new Date('2099-12-31T23:59:59Z'),
});

/** Arbitrary for an EntryPropertyRecord. */
const arbEntryPropertyRecord: fc.Arbitrary<EntryPropertyRecord> = fc.record({
  entryType: fc.constantFrom(...ENTRY_TYPES),
  title: arbSafeString,
  tags: fc.array(arbTag, { minLength: 0, maxLength: 3 }),
  favorite: fc.boolean(),
  createdAt: arbDate,
  updatedAt: arbDate,
  siteUrl: arbSiteUrl,
});

/** Arbitrary for a password string. */
const arbPassword: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9!@#$%]{4,20}$/,
);

/** Arbitrary for a credit card number string. */
const arbCardNumber: fc.Arbitrary<string> = fc.stringMatching(
  /^[0-9]{13,19}$/,
);

/** Arbitrary for a CVV string. */
const arbCvv: fc.Arbitrary<string> = fc.stringMatching(/^[0-9]{3,4}$/);

/** Arbitrary for a LoginEntry (for Property 5). */
const arbLoginEntry: fc.Arbitrary<LoginEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('login' as const),
  title: arbSafeString,
  notes: fc.option(arbSafeString, { nil: undefined }),
  tags: fc.array(arbTag, { minLength: 0, maxLength: 2 }),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.constant(undefined),
  siteUrl: arbSiteUrl,
  username: arbSafeString,
  password: arbPassword,
  totpSecret: fc.option(arbSafeString, { nil: undefined }),
});

/** Arbitrary for a CreditCardEntry (for Property 5). */
const arbCreditCardEntry: fc.Arbitrary<CreditCardEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('credit_card' as const),
  title: arbSafeString,
  notes: fc.option(arbSafeString, { nil: undefined }),
  tags: fc.array(arbTag, { minLength: 0, maxLength: 2 }),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.constant(undefined),
  cardholderName: arbSafeString,
  cardNumber: arbCardNumber,
  expirationDate: fc.constant('12/25'),
  cvv: arbCvv,
});


// ---------------------------------------------------------------------------
// Property 4: Entry list rendering completeness
// ---------------------------------------------------------------------------

describe('Property 4: Entry list rendering completeness', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /** Map entry types to expected MUI icon test IDs. */
  const typeToIconTestId: Record<VaultEntryType, string> = {
    login: 'VpnKeyIcon',
    secure_note: 'NoteIcon',
    credit_card: 'CreditCardIcon',
    identity: 'BadgeIcon',
  };

  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * For any EntryPropertyRecord, the rendered entry list item should contain
   * the entry's title, tags, favorite star (when true), siteUrl, and the
   * correct type icon.
   */
  it('rendered entry item contains title, tags, favorite, siteUrl, and correct type icon', async () => {
    await fc.assert(
      fc.asyncProperty(arbEntryPropertyRecord, async (entry) => {
        cleanup();

        mockUseBrightPass.mockReturnValue({
          vault: {
            vaultId: 'test-vault-id',
            metadata: {
              id: 'test-vault-id',
              name: 'Test Vault',
              ownerId: 'owner-1',
              createdAt: new Date(),
              updatedAt: new Date(),
              entryCount: 1,
              sharedWith: [],
              vcblBlockId: 'a'.repeat(64),
            },
            propertyRecords: [entry],
          },
          lockVault: jest.fn(),
          isVaultUnlocked: () => true,
          unlockVault: jest.fn(),
          autoLockTimeout: 900000,
          setAutoLockTimeout: jest.fn(),
        });

        render(<VaultDetailView />);

        // Title should be present
        expect(screen.getByText(entry.title)).toBeTruthy();

        // Site URL should be present
        if (entry.siteUrl) {
          expect(screen.getByText(entry.siteUrl)).toBeTruthy();
        }

        // Tags should be present as chips
        for (const tag of entry.tags) {
          expect(screen.getByText(tag)).toBeTruthy();
        }

        // Favorite star icon when favorite is true
        if (entry.favorite) {
          expect(screen.getByTestId('StarIcon')).toBeTruthy();
        } else {
          expect(screen.queryByTestId('StarIcon')).toBeNull();
        }

        // Correct type icon
        const expectedIcon = typeToIconTestId[entry.entryType];
        expect(screen.getByTestId(expectedIcon)).toBeTruthy();

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Property 5: Sensitive field masking
// ---------------------------------------------------------------------------

describe('Property 5: Sensitive field masking', () => {
  const MASK = '••••••••';

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * For any LoginEntry, the password field should be masked by default,
   * and toggling reveal should show the actual value.
   */
  it('LoginEntry password is masked by default and revealed on toggle', async () => {
    await fc.assert(
      fc.asyncProperty(arbLoginEntry, async (entry) => {
        cleanup();
        jest.clearAllMocks();

        mockGetEntry.mockImplementation(() => Promise.resolve(entry));
        mockCheckBreach.mockImplementation(() =>
          Promise.resolve({ breached: false, count: 0 }),
        );

        render(
          <EntryDetailView vaultId="test-vault" entryId={entry.id} />,
        );

        // Wait for the toggle button to appear — entry fully loaded
        const toggleButton = await screen.findByLabelText(
          'EntryDetail_ShowPassword',
          {},
          { timeout: 3000 },
        );

        // Verify masked field is present
        expect(
          screen.getAllByDisplayValue(MASK).length,
        ).toBeGreaterThanOrEqual(1);

        // Click the toggle button to reveal
        fireEvent.click(toggleButton);

        // Now the actual password should be visible
        expect(screen.getByDisplayValue(entry.password)).toBeTruthy();

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);

  /**
   * **Validates: Requirements 4.4**
   *
   * For any CreditCardEntry, cardNumber and cvv should be masked by default,
   * and toggling reveal should show the actual values.
   */
  it('CreditCardEntry cardNumber and cvv are masked by default and revealed on toggle', async () => {
    await fc.assert(
      fc.asyncProperty(arbCreditCardEntry, async (entry) => {
        cleanup();
        jest.clearAllMocks();

        mockGetEntry.mockImplementation(() => Promise.resolve(entry));

        render(
          <EntryDetailView vaultId="test-vault" entryId={entry.id} />,
        );

        // Wait for toggle buttons to appear — entry is fully loaded
        await waitFor(
          () => {
            expect(
              screen.getAllByLabelText('EntryDetail_ShowPassword').length,
            ).toBe(2);
          },
          { timeout: 3000 },
        );

        // Both cardNumber and cvv are masked
        expect(screen.getAllByDisplayValue(MASK).length).toBe(2);

        // Click first toggle to reveal cardNumber
        fireEvent.click(
          screen.getAllByLabelText('EntryDetail_ShowPassword')[0],
        );

        // cardNumber should now be visible
        expect(screen.getByDisplayValue(entry.cardNumber)).toBeTruthy();

        // Re-query — the remaining ShowPassword toggle is for cvv
        fireEvent.click(
          screen.getByLabelText('EntryDetail_ShowPassword'),
        );

        // cvv should now be visible
        expect(screen.getByDisplayValue(entry.cvv)).toBeTruthy();

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 120_000);
});


// ---------------------------------------------------------------------------
// Property 7: Client-side entry filtering (pure function test)
// ---------------------------------------------------------------------------

describe('Property 7: Client-side entry filtering', () => {
  /**
   * **Validates: Requirements 5.1, 5.3, 5.4**
   *
   * For any list of EntryPropertyRecord items and any text query,
   * the filtered result should contain exactly those entries whose
   * title, tags, or siteUrl match the query (case-insensitive).
   */
  it('text search returns exactly entries matching title, tags, or siteUrl', () => {
    fc.assert(
      fc.property(
        fc.array(arbEntryPropertyRecord, { minLength: 0, maxLength: 20 }),
        arbSafeString,
        (entries: EntryPropertyRecord[], query: string) => {
          const emptyTypes = new Set<VaultEntryType>();
          const filtered = filterEntries(entries, query, emptyTypes, false);
          const lowerQuery = query.trim().toLowerCase();

          for (const entry of entries) {
            const matchesText =
              !lowerQuery ||
              entry.title.toLowerCase().includes(lowerQuery) ||
              entry.tags.some((tag: string) =>
                tag.toLowerCase().includes(lowerQuery),
              ) ||
              entry.siteUrl.toLowerCase().includes(lowerQuery);

            if (matchesText) {
              expect(filtered).toContainEqual(entry);
            } else {
              expect(filtered).not.toContainEqual(entry);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * For any list of entries and any set of active type filters,
   * the filtered result should contain exactly those entries whose
   * entryType is in the active set (or all entries if set is empty).
   */
  it('type filter returns exactly entries matching active types', () => {
    const arbTypeSet: fc.Arbitrary<Set<VaultEntryType>> = fc
      .subarray(ENTRY_TYPES, { minLength: 0, maxLength: 4 })
      .map((arr) => new Set(arr));

    fc.assert(
      fc.property(
        fc.array(arbEntryPropertyRecord, { minLength: 0, maxLength: 20 }),
        arbTypeSet,
        (entries: EntryPropertyRecord[], activeTypes: Set<VaultEntryType>) => {
          const filtered = filterEntries(entries, '', activeTypes, false);

          for (const entry of entries) {
            const matchesType =
              activeTypes.size === 0 || activeTypes.has(entry.entryType);

            if (matchesType) {
              expect(filtered).toContainEqual(entry);
            } else {
              expect(filtered).not.toContainEqual(entry);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * For any list of entries, the favorites filter should return
   * exactly those entries where favorite === true.
   */
  it('favorites filter returns exactly favorite entries', () => {
    fc.assert(
      fc.property(
        fc.array(arbEntryPropertyRecord, { minLength: 0, maxLength: 20 }),
        (entries: EntryPropertyRecord[]) => {
          const emptyTypes = new Set<VaultEntryType>();
          const filtered = filterEntries(entries, '', emptyTypes, true);

          for (const entry of entries) {
            if (entry.favorite) {
              expect(filtered).toContainEqual(entry);
            } else {
              expect(filtered).not.toContainEqual(entry);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.1, 5.3, 5.4**
   *
   * Combined filters: text + type + favorites should return exactly
   * entries satisfying ALL predicates simultaneously.
   */
  it('combined filters return exactly entries matching all predicates', () => {
    const arbTypeSet: fc.Arbitrary<Set<VaultEntryType>> = fc
      .subarray(ENTRY_TYPES, { minLength: 0, maxLength: 4 })
      .map((arr) => new Set(arr));

    fc.assert(
      fc.property(
        fc.array(arbEntryPropertyRecord, { minLength: 0, maxLength: 20 }),
        arbSafeString,
        arbTypeSet,
        fc.boolean(),
        (
          entries: EntryPropertyRecord[],
          query: string,
          activeTypes: Set<VaultEntryType>,
          favoritesOnly: boolean,
        ) => {
          const filtered = filterEntries(
            entries,
            query,
            activeTypes,
            favoritesOnly,
          );
          const lowerQuery = query.trim().toLowerCase();

          for (const entry of entries) {
            const matchesText =
              !lowerQuery ||
              entry.title.toLowerCase().includes(lowerQuery) ||
              entry.tags.some((tag: string) =>
                tag.toLowerCase().includes(lowerQuery),
              ) ||
              entry.siteUrl.toLowerCase().includes(lowerQuery);
            const matchesType =
              activeTypes.size === 0 || activeTypes.has(entry.entryType);
            const matchesFav = !favoritesOnly || entry.favorite;

            const shouldBeIncluded = matchesText && matchesType && matchesFav;

            if (shouldBeIncluded) {
              expect(filtered).toContainEqual(entry);
            } else {
              expect(filtered).not.toContainEqual(entry);
            }
          }

          // Also verify no extra entries snuck in
          expect(filtered.length).toBeLessThanOrEqual(entries.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
