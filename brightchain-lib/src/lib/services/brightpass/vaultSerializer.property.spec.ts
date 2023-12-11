/**
 * Property-based tests for VaultSerializer
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of vault entry and audit log
 * serialization/deserialization using fast-check for property-based testing.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
 */

import fc from 'fast-check';
import {
  AuditAction,
  AuditLogEntry,
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
  VaultEntryType,
} from '../../interfaces/brightpass';
import { VaultSerializer } from './vaultSerializer';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const validEntryTypes: VaultEntryType[] = [
  'login',
  'secure_note',
  'credit_card',
  'identity',
];

/** Non-empty string that won't be empty after trimming */
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 64 });

/** Date arbitrary that produces valid, serializable dates via timestamp */
const dateArb = fc
  .integer({
    min: new Date('2000-01-01T00:00:00.000Z').getTime(),
    max: new Date('2099-12-31T23:59:59.999Z').getTime(),
  })
  .map((ts) => new Date(ts));

/** Optional tags array */
const tagsArb = fc.option(
  fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  { nil: undefined },
);

/** LoginEntry arbitrary */
const loginEntryArb: fc.Arbitrary<LoginEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('login' as const),
  title: nonEmptyStringArb,
  notes: fc.option(nonEmptyStringArb, { nil: undefined }),
  tags: tagsArb,
  createdAt: dateArb,
  updatedAt: dateArb,
  favorite: fc.boolean(),
  siteUrl: fc.webUrl(),
  username: nonEmptyStringArb,
  password: nonEmptyStringArb,
  totpSecret: fc.option(nonEmptyStringArb, { nil: undefined }),
});

/** SecureNoteEntry arbitrary */
const secureNoteEntryArb: fc.Arbitrary<SecureNoteEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('secure_note' as const),
  title: nonEmptyStringArb,
  notes: fc.option(nonEmptyStringArb, { nil: undefined }),
  tags: tagsArb,
  createdAt: dateArb,
  updatedAt: dateArb,
  favorite: fc.boolean(),
  content: nonEmptyStringArb,
});

/** CreditCardEntry arbitrary */
const creditCardEntryArb: fc.Arbitrary<CreditCardEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('credit_card' as const),
  title: nonEmptyStringArb,
  notes: fc.option(nonEmptyStringArb, { nil: undefined }),
  tags: tagsArb,
  createdAt: dateArb,
  updatedAt: dateArb,
  favorite: fc.boolean(),
  cardholderName: nonEmptyStringArb,
  cardNumber: fc
    .array(fc.integer({ min: 0, max: 9 }), { minLength: 13, maxLength: 19 })
    .map((digits) => digits.join('')),
  expirationDate: fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 24, max: 35 }))
    .map(([m, y]) => `${String(m).padStart(2, '0')}/${y}`),
  cvv: fc
    .array(fc.integer({ min: 0, max: 9 }), { minLength: 3, maxLength: 4 })
    .map((digits) => digits.join('')),
});

/** IdentityEntry arbitrary */
const identityEntryArb: fc.Arbitrary<IdentityEntry> = fc.record({
  id: fc.uuid(),
  type: fc.constant('identity' as const),
  title: nonEmptyStringArb,
  notes: fc.option(nonEmptyStringArb, { nil: undefined }),
  tags: tagsArb,
  createdAt: dateArb,
  updatedAt: dateArb,
  favorite: fc.boolean(),
  firstName: nonEmptyStringArb,
  lastName: nonEmptyStringArb,
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  phone: fc.option(nonEmptyStringArb, { nil: undefined }),
  address: fc.option(nonEmptyStringArb, { nil: undefined }),
});

/** Any valid VaultEntry */
const vaultEntryArb: fc.Arbitrary<VaultEntry> = fc.oneof(
  loginEntryArb,
  secureNoteEntryArb,
  creditCardEntryArb,
  identityEntryArb,
);

/** All AuditAction enum values */
const allAuditActions = Object.values(AuditAction);

/** AuditLogEntry arbitrary */
const auditLogEntryArb: fc.Arbitrary<AuditLogEntry> = fc.record({
  id: fc.uuid(),
  vaultId: fc.uuid(),
  memberId: fc.uuid(),
  action: fc.constantFrom(...allAuditActions),
  timestamp: dateArb,
  metadata: fc.option(
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 16 }),
      fc.string({ maxLength: 64 }),
      { minKeys: 0, maxKeys: 4 },
    ),
    { nil: undefined },
  ),
});

// ---------------------------------------------------------------------------
// Property 11: Vault Serialization Round-Trip
// ---------------------------------------------------------------------------

/**
 * Property 11: Vault Serialization Round-Trip
 *
 * For any valid VaultEntry object, serializing to JSON and deserializing back
 * SHALL produce an equivalent object with Date fields properly reconstructed.
 *
 * **Validates: Requirements 6.1, 6.2**
 */
describe('Feature: api-lib-to-lib-migration, Property 11: Vault Serialization Round-Trip', () => {
  it('Property 11a: Round-trip preserves all VaultEntry fields', () => {
    fc.assert(
      fc.property(vaultEntryArb, (entry) => {
        const json = VaultSerializer.serializeEntry(entry);
        const result = VaultSerializer.deserializeEntry(json);

        expect(result.id).toBe(entry.id);
        expect(result.type).toBe(entry.type);
        expect(result.title).toBe(entry.title);
        expect(result.favorite).toBe(entry.favorite);
        expect(result.notes).toBe(entry.notes);

        // Tags comparison (both undefined or equal arrays)
        if (entry.tags === undefined) {
          expect(result.tags).toBeUndefined();
        } else {
          expect(result.tags).toEqual(entry.tags);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11b: Round-trip reconstructs Date fields as Date instances', () => {
    fc.assert(
      fc.property(vaultEntryArb, (entry) => {
        const json = VaultSerializer.serializeEntry(entry);
        const result = VaultSerializer.deserializeEntry(json);

        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.updatedAt).toBeInstanceOf(Date);
        expect(result.createdAt.toISOString()).toBe(
          entry.createdAt.toISOString(),
        );
        expect(result.updatedAt.toISOString()).toBe(
          entry.updatedAt.toISOString(),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11c: Serialization produces valid JSON with ISO date strings', () => {
    fc.assert(
      fc.property(vaultEntryArb, (entry) => {
        const json = VaultSerializer.serializeEntry(entry);
        const parsed = JSON.parse(json);

        // Dates should be serialized as ISO strings, not Date objects
        expect(typeof parsed.createdAt).toBe('string');
        expect(typeof parsed.updatedAt).toBe('string');
        // Verify they are valid ISO date strings
        expect(new Date(parsed.createdAt).toISOString()).toBe(parsed.createdAt);
        expect(new Date(parsed.updatedAt).toISOString()).toBe(parsed.updatedAt);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11d: Round-trip preserves type-specific fields for login entries', () => {
    fc.assert(
      fc.property(loginEntryArb, (entry) => {
        const json = VaultSerializer.serializeEntry(entry);
        const result = VaultSerializer.deserializeEntry(json) as LoginEntry;

        expect(result.siteUrl).toBe(entry.siteUrl);
        expect(result.username).toBe(entry.username);
        expect(result.password).toBe(entry.password);
        expect(result.totpSecret).toBe(entry.totpSecret);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 11e: Round-trip preserves type-specific fields for all entry types', () => {
    fc.assert(
      fc.property(creditCardEntryArb, (entry) => {
        const json = VaultSerializer.serializeEntry(entry);
        const result = VaultSerializer.deserializeEntry(
          json,
        ) as CreditCardEntry;

        expect(result.cardholderName).toBe(entry.cardholderName);
        expect(result.cardNumber).toBe(entry.cardNumber);
        expect(result.expirationDate).toBe(entry.expirationDate);
        expect(result.cvv).toBe(entry.cvv);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Vault Deserialization Validation
// ---------------------------------------------------------------------------

/**
 * Property 12: Vault Deserialization Validation
 *
 * For any JSON string with invalid type (not login/secure_note/credit_card/identity)
 * or missing required fields (id, title), deserialization SHALL throw a descriptive error.
 *
 * **Validates: Requirements 6.3, 6.4**
 */
describe('Feature: api-lib-to-lib-migration, Property 12: Vault Deserialization Validation', () => {
  /** Generate a type string that is NOT one of the valid entry types */
  const invalidTypeArb = fc.string({ minLength: 1, maxLength: 32 }).map((s) => {
    // Ensure the generated string is not a valid type by appending a suffix
    if (validEntryTypes.includes(s as VaultEntryType)) {
      return s + '_invalid';
    }
    return s;
  });

  it('Property 12a: Deserialization rejects invalid entry types', () => {
    fc.assert(
      fc.property(
        invalidTypeArb,
        fc.uuid(),
        nonEmptyStringArb,
        (invalidType, id, title) => {
          const json = JSON.stringify({
            id,
            title,
            type: invalidType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
            `Invalid entry type: ${invalidType}`,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12b: Deserialization rejects entries missing id field', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validEntryTypes),
        nonEmptyStringArb,
        (type, title) => {
          const json = JSON.stringify({
            type,
            title,
            // id is intentionally missing
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
            'Missing required fields: id, title',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12c: Deserialization rejects entries missing title field', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validEntryTypes),
        fc.uuid(),
        (type, id) => {
          const json = JSON.stringify({
            id,
            type,
            // title is intentionally missing
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
            'Missing required fields: id, title',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 12d: Deserialization rejects entries missing both id and title', () => {
    fc.assert(
      fc.property(fc.constantFrom(...validEntryTypes), (type) => {
        const json = JSON.stringify({
          type,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
          'Missing required fields: id, title',
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 12e: Deserialization throws descriptive error on malformed JSON', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (garbage) => {
        // Ensure the string is not valid JSON by prepending invalid chars
        const malformedJson = '{invalid:' + garbage;

        expect(() => VaultSerializer.deserializeEntry(malformedJson)).toThrow(
          /JSON parse error:/,
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 12f: Deserialization rejects missing type field', () => {
    fc.assert(
      fc.property(fc.uuid(), nonEmptyStringArb, (id, title) => {
        const json = JSON.stringify({
          id,
          title,
          // type is intentionally missing
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        expect(() => VaultSerializer.deserializeEntry(json)).toThrow(
          /Invalid entry type/,
        );
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Audit Log Round-Trip
// ---------------------------------------------------------------------------

/**
 * Property 13: Audit Log Round-Trip
 *
 * For any valid AuditLogEntry object, serializing and deserializing SHALL produce
 * an equivalent object with timestamp properly reconstructed.
 *
 * **Validates: Requirements 6.6**
 */
describe('Feature: api-lib-to-lib-migration, Property 13: Audit Log Round-Trip', () => {
  it('Property 13a: Round-trip preserves all AuditLogEntry fields', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const json = VaultSerializer.serializeAuditLog(entry);
        const result = VaultSerializer.deserializeAuditLog(json);

        expect(result.id).toBe(entry.id);
        expect(result.vaultId).toBe(entry.vaultId);
        expect(result.memberId).toBe(entry.memberId);
        expect(result.action).toBe(entry.action);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 13b: Round-trip reconstructs timestamp as Date instance', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const json = VaultSerializer.serializeAuditLog(entry);
        const result = VaultSerializer.deserializeAuditLog(json);

        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.toISOString()).toBe(
          entry.timestamp.toISOString(),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 13c: Round-trip preserves metadata', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const json = VaultSerializer.serializeAuditLog(entry);
        const result = VaultSerializer.deserializeAuditLog(json);

        if (entry.metadata === undefined) {
          expect(result.metadata).toBeUndefined();
        } else {
          expect(result.metadata).toEqual(entry.metadata);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 13d: Serialization produces valid JSON with ISO timestamp string', () => {
    fc.assert(
      fc.property(auditLogEntryArb, (entry) => {
        const json = VaultSerializer.serializeAuditLog(entry);
        const parsed = JSON.parse(json);

        expect(typeof parsed.timestamp).toBe('string');
        expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 13e: Round-trip preserves all AuditAction enum values', () => {
    fc.assert(
      fc.property(fc.constantFrom(...allAuditActions), (action) => {
        const entry: AuditLogEntry = {
          id: 'test-id',
          vaultId: 'vault-id',
          memberId: 'member-id',
          action,
          timestamp: new Date('2024-06-15T12:00:00.000Z'),
        };

        const json = VaultSerializer.serializeAuditLog(entry);
        const result = VaultSerializer.deserializeAuditLog(json);

        expect(result.action).toBe(action);
      }),
      { numRuns: 100 },
    );
  });
});
