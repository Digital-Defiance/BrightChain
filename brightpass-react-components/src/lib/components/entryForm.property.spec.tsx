/**
 * Property-based tests for EntryForm pre-population round-trip
 *
 * **Property 6: Edit form pre-population round-trip**
 *
 * For any VaultEntry, opening the edit form should pre-populate all editable
 * fields such that reading the form values back produces an object equivalent
 * to the original entry's editable fields.
 *
 * **Validates: Requirements 4.7**
 */

import fc from 'fast-check';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import type {
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from '@brightchain/brightchain-lib';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    createEntry: jest.fn(),
    updateEntry: jest.fn(),
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
  useBrightPassTranslation: () => ({ t: stableT }),
}));

// Import component under test AFTER mocks
import EntryForm from './EntryForm';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbSafeString = fc.stringMatching(/^[a-z][a-z0-9]{1,12}$/);

const arbDate = fc
  .integer({
    min: new Date('2000-01-01T00:00:00Z').getTime(),
    max: new Date('2099-12-31T23:59:59Z').getTime(),
  })
  .map((ts) => new Date(ts));

const arbTag = arbSafeString;

const arbSiteUrl = arbSafeString.map((s) => `https://${s}.example.com`);

const arbPassword = fc.stringMatching(/^[a-zA-Z0-9!@#$%]{4,20}$/);

const arbCardNumber = fc.stringMatching(/^[0-9]{13,19}$/);

const arbCvv = fc.stringMatching(/^[0-9]{3,4}$/);

/** Tags: array of 0-3 safe strings (no commas to avoid join/split ambiguity). */
const arbTags = fc.array(arbTag, { minLength: 0, maxLength: 3 });

const arbLoginEntry: fc.Arbitrary<LoginEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('login' as const),
  title: arbSafeString,
  notes: fc.option(arbSafeString, { nil: undefined }),
  tags: fc.option(arbTags, { nil: undefined }),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.constant(undefined),
  siteUrl: arbSiteUrl,
  username: arbSafeString,
  password: arbPassword,
  totpSecret: fc.option(arbSafeString, { nil: undefined }),
});

const arbSecureNoteEntry: fc.Arbitrary<SecureNoteEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('secure_note' as const),
  title: arbSafeString,
  notes: fc.option(arbSafeString, { nil: undefined }),
  tags: fc.option(arbTags, { nil: undefined }),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.constant(undefined),
  content: arbSafeString,
});

const arbCreditCardEntry: fc.Arbitrary<CreditCardEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('credit_card' as const),
  title: arbSafeString,
  notes: fc.option(arbSafeString, { nil: undefined }),
  tags: fc.option(arbTags, { nil: undefined }),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.constant(undefined),
  cardholderName: arbSafeString,
  cardNumber: arbCardNumber,
  expirationDate: fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 24, max: 35 }))
    .map(([m, y]) => `${String(m).padStart(2, '0')}/${y}`),
  cvv: arbCvv,
});

const arbIdentityEntry: fc.Arbitrary<IdentityEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('identity' as const),
  title: arbSafeString,
  notes: fc.option(arbSafeString, { nil: undefined }),
  tags: fc.option(arbTags, { nil: undefined }),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.constant(undefined),
  firstName: arbSafeString,
  lastName: arbSafeString,
  email: fc.option(arbSafeString, { nil: undefined }),
  phone: fc.option(arbSafeString, { nil: undefined }),
  address: fc.option(arbSafeString, { nil: undefined }),
});

const arbVaultEntry: fc.Arbitrary<VaultEntry> = fc.oneof(
  arbLoginEntry,
  arbSecureNoteEntry,
  arbCreditCardEntry,
  arbIdentityEntry,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Query a text field by its label and return its current value.
 * The mock t() returns the key as-is, so labels match BrightPassStrings keys.
 */
function getFieldValue(label: string): string {
  const el = screen.getByLabelText(label, { exact: false });
  return (el as HTMLInputElement).value;
}

function getCheckboxChecked(label: string): boolean {
  const el = screen.getByLabelText(label, { exact: false });
  return (el as HTMLInputElement).checked;
}

// ---------------------------------------------------------------------------
// Property 6: Edit form pre-population round-trip
// ---------------------------------------------------------------------------

describe('Property 6: Edit form pre-population round-trip', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 4.7**
   *
   * For any VaultEntry, rendering EntryForm in edit mode should pre-populate
   * all editable fields so that reading form values back matches the original.
   */
  it('common fields (title, notes, tags, favorite) are pre-populated correctly for any VaultEntry', () => {
    fc.assert(
      fc.property(arbVaultEntry, (entry) => {
        cleanup();

        render(
          <EntryForm vaultId="test-vault" entry={entry} />,
        );

        // Title
        expect(getFieldValue('EntryForm_FieldTitle')).toBe(entry.title);

        // Notes: undefined → ''
        expect(getFieldValue('EntryForm_FieldNotes')).toBe(
          entry.notes ?? '',
        );

        // Tags: joined with ', '
        const expectedTags = entry.tags?.join(', ') ?? '';
        expect(getFieldValue('EntryForm_FieldTags')).toBe(expectedTags);

        // Favorite checkbox
        expect(getCheckboxChecked('EntryForm_FieldFavorite')).toBe(
          entry.favorite,
        );

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('LoginEntry type-specific fields are pre-populated correctly', () => {
    fc.assert(
      fc.property(arbLoginEntry, (entry) => {
        cleanup();

        render(
          <EntryForm vaultId="test-vault" entry={entry} />,
        );

        expect(getFieldValue('EntryDetail_SiteUrl')).toBe(entry.siteUrl);
        expect(getFieldValue('EntryDetail_Username')).toBe(entry.username);
        expect(getFieldValue('EntryDetail_Password')).toBe(entry.password);
        expect(getFieldValue('EntryDetail_TotpSecret')).toBe(
          entry.totpSecret ?? '',
        );

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('SecureNoteEntry content field is pre-populated correctly', () => {
    fc.assert(
      fc.property(arbSecureNoteEntry, (entry) => {
        cleanup();

        render(
          <EntryForm vaultId="test-vault" entry={entry} />,
        );

        expect(getFieldValue('EntryDetail_Content')).toBe(entry.content);

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('CreditCardEntry type-specific fields are pre-populated correctly', () => {
    fc.assert(
      fc.property(arbCreditCardEntry, (entry) => {
        cleanup();

        render(
          <EntryForm vaultId="test-vault" entry={entry} />,
        );

        expect(getFieldValue('EntryDetail_CardholderName')).toBe(
          entry.cardholderName,
        );
        expect(getFieldValue('EntryDetail_CardNumber')).toBe(
          entry.cardNumber,
        );
        expect(getFieldValue('EntryDetail_ExpirationDate')).toBe(
          entry.expirationDate,
        );
        expect(getFieldValue('EntryDetail_CVV')).toBe(entry.cvv);

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 60_000);

  it('IdentityEntry type-specific fields are pre-populated correctly', () => {
    fc.assert(
      fc.property(arbIdentityEntry, (entry) => {
        cleanup();

        render(
          <EntryForm vaultId="test-vault" entry={entry} />,
        );

        expect(getFieldValue('EntryDetail_FirstName')).toBe(entry.firstName);
        expect(getFieldValue('EntryDetail_LastName')).toBe(entry.lastName);
        expect(getFieldValue('EntryDetail_Email')).toBe(entry.email ?? '');
        expect(getFieldValue('EntryDetail_Phone')).toBe(entry.phone ?? '');
        expect(getFieldValue('EntryDetail_Address')).toBe(
          entry.address ?? '',
        );

        cleanup();
      }),
      { numRuns: 100 },
    );
  }, 60_000);
});
