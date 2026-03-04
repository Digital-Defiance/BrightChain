/**
 * @fileoverview Property-based tests for BrightPass shared interface JSON round-trip
 *
 * **Property 22: Shared interface JSON round-trip**
 * **Validates: Requirements 17.5**
 *
 * For any valid instance of the BrightPass shared interfaces, serializing to JSON
 * and deserializing back should produce an equivalent object. Date fields are
 * compared as ISO strings since JSON.parse produces strings for Date values.
 */

import * as fc from 'fast-check';
import type { BlockId } from '../branded/primitives/blockId';
import type { AuditLogEntry } from './auditLog';
import { AuditAction } from './auditLog';
import type { IBreachCheckResult } from './breachCheck';
import type { IBrightPassError } from './brightPassError';
import type { EmergencyAccessConfig } from './emergencyAccess';
import type { EntryPropertyRecord } from './entryPropertyRecord';
import type { ImportResult } from './importTypes';
import type {
  IGeneratedPassword,
  IPasswordGenerationOptions,
} from './passwordGeneration';
import type { ITotpCode, ITotpValidation } from './totp';
import type {
  AttachmentReference,
  CreditCardEntry,
  IdentityEntry,
  LoginEntry,
  SecureNoteEntry,
  VaultEntry,
} from './vaultEntry';
import type {
  AutofillPayload,
  DecryptedVault,
  EntrySearchQuery,
  IAutofillPayload,
  IDecryptedVault,
  VaultMetadata,
} from './vaultMetadata';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Prepare an object for JSON serialization: convert Date instances to ISO
 * strings and Uint8Array to plain arrays. This avoids issues with the custom
 * test environment's JSON.stringify wrapper which breaks Date serialization.
 */
function toJsonSafe(obj: unknown): unknown {
  if (obj === undefined) {
    return undefined;
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (obj instanceof Uint8Array) {
    return Array.from(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(toJsonSafe);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const converted = toJsonSafe(value);
      // Only include defined values (JSON.stringify strips undefined)
      if (converted !== undefined) {
        result[key] = converted;
      }
    }
    return result;
  }
  return obj;
}

/**
 * Perform a JSON round-trip using a safe serialization path:
 * 1. Convert Dates/Uint8Arrays to JSON-safe primitives
 * 2. Serialize to JSON string
 * 3. Deserialize back
 */
function jsonRoundTrip<T>(obj: T): unknown {
  const safe = toJsonSafe(obj);
  return JSON.parse(JSON.stringify(safe));
}

// ---------------------------------------------------------------------------
// Custom character arbitraries (fast-check v4 API)
// ---------------------------------------------------------------------------

const hexChar = fc.mapToConstant(
  { num: 10, build: (v) => String(v) },
  { num: 6, build: (v) => String.fromCharCode('a'.charCodeAt(0) + v) },
);

const digitChar = fc.mapToConstant({ num: 10, build: (v) => String(v) });

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for a valid BlockId (64-char lowercase hex). */
const arbBlockId: fc.Arbitrary<BlockId> = fc
  .string({ unit: hexChar, minLength: 64, maxLength: 64 })
  .map((s) => s as unknown as BlockId);

/** Arbitrary for a Date (using integer timestamps to avoid custom env issues). */
const arbDate: fc.Arbitrary<Date> = fc
  .integer({
    min: new Date('2000-01-01').getTime(),
    max: new Date('2099-12-31').getTime(),
  })
  .map((ts) => new Date(ts));

const arbVaultEntryType = fc.constantFrom(
  'login' as const,
  'secure_note' as const,
  'credit_card' as const,
  'identity' as const,
);

const arbAuditAction = fc.constantFrom(...Object.values(AuditAction));

const arbAttachmentReference: fc.Arbitrary<AttachmentReference> = fc.record({
  id: fc.uuid(),
  filename: fc.string({ minLength: 1, maxLength: 50 }),
  mimeType: fc.constantFrom(
    'application/pdf',
    'image/png',
    'text/plain',
    'application/octet-stream',
  ),
  sizeBytes: fc.nat({ max: 100_000_000 }),
  blockId: arbBlockId,
  isCbl: fc.boolean(),
});

// --- Simple interfaces ---

const arbPasswordGenerationOptions: fc.Arbitrary<IPasswordGenerationOptions> =
  fc.record({
    length: fc.integer({ min: 8, max: 128 }),
    uppercase: fc.boolean(),
    lowercase: fc.boolean(),
    digits: fc.boolean(),
    symbols: fc.boolean(),
  });

const arbGeneratedPassword: fc.Arbitrary<IGeneratedPassword> = fc.record({
  password: fc.string({ minLength: 0, maxLength: 128 }),
  entropy: fc.double({ min: 0, max: 1000, noNaN: true }),
  strength: fc.constantFrom(
    'weak' as const,
    'fair' as const,
    'strong' as const,
    'very_strong' as const,
  ),
});

const arbDigitString6 = fc.string({
  unit: digitChar,
  minLength: 6,
  maxLength: 6,
});

const arbTotpCode: fc.Arbitrary<ITotpCode> = fc.record({
  code: arbDigitString6,
  remainingSeconds: fc.integer({ min: 0, max: 29 }),
  period: fc.constantFrom(30, 60),
});

const arbTotpValidation: fc.Arbitrary<ITotpValidation> = fc.record({
  valid: fc.boolean(),
});

const arbBreachCheckResult: fc.Arbitrary<IBreachCheckResult> = fc.record({
  breached: fc.boolean(),
  count: fc.nat({ max: 10_000_000 }),
});

const arbBrightPassError: fc.Arbitrary<IBrightPassError> = fc.record({
  code: fc.string({ minLength: 1, maxLength: 30 }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  details: fc.option(
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    ),
    { nil: undefined },
  ),
});

const arbEmergencyAccessConfig: fc.Arbitrary<EmergencyAccessConfig> = fc
  .integer({ min: 1, max: 10 })
  .chain((n) =>
    fc.record({
      vaultId: fc.uuid(),
      threshold: fc.integer({ min: 1, max: n }),
      totalShares: fc.constant(n),
      trustees: fc.array(fc.uuid(), { minLength: n, maxLength: n }),
    }),
  );

const arbEntryPropertyRecord: fc.Arbitrary<EntryPropertyRecord> = fc.record({
  entryType: arbVaultEntryType,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 30 }), {
    minLength: 0,
    maxLength: 5,
  }),
  favorite: fc.boolean(),
  createdAt: arbDate,
  updatedAt: arbDate,
  siteUrl: fc.webUrl(),
});

const arbImportResult: fc.Arbitrary<ImportResult> = fc
  .nat({ max: 1000 })
  .chain((total) =>
    fc.record({
      totalRecords: fc.constant(total),
      successfulImports: fc.integer({ min: 0, max: total }),
      errors: fc.array(
        fc.record({
          recordIndex: fc.integer({ min: 0, max: Math.max(total - 1, 0) }),
          error: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        { minLength: 0, maxLength: Math.min(total, 10) },
      ),
    }),
  );

const arbAuditLogEntry: fc.Arbitrary<AuditLogEntry> = fc.record({
  id: fc.uuid(),
  vaultId: fc.uuid(),
  memberId: fc.uuid(),
  action: arbAuditAction,
  timestamp: arbDate,
  metadata: fc.option(
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.string({ minLength: 0, maxLength: 50 }),
    ),
    { nil: undefined },
  ),
});

// --- Vault metadata interfaces ---

const arbVaultMetadata: fc.Arbitrary<VaultMetadata> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  ownerId: fc.uuid(),
  createdAt: arbDate,
  updatedAt: arbDate,
  entryCount: fc.nat({ max: 10000 }),
  sharedWith: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
  vcblBlockId: arbBlockId,
});

const arbAutofillPayload: fc.Arbitrary<AutofillPayload> = fc.record({
  vaultId: fc.uuid(),
  entries: fc.array(
    fc.record({
      entryId: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      username: fc.string({ minLength: 1, maxLength: 50 }),
      password: fc.string({ minLength: 1, maxLength: 128 }),
      siteUrl: fc.webUrl(),
      totpCode: fc.option(arbDigitString6, { nil: undefined }),
    }),
    { minLength: 0, maxLength: 5 },
  ),
});

const arbIDecryptedVault: fc.Arbitrary<IDecryptedVault<string>> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  ownerId: fc.uuid(),
  propertyRecords: fc.array(arbEntryPropertyRecord, {
    minLength: 0,
    maxLength: 3,
  }),
  createdAt: fc.string({ minLength: 1, maxLength: 30 }),
  updatedAt: fc.string({ minLength: 1, maxLength: 30 }),
});

const arbIAutofillPayload: fc.Arbitrary<IAutofillPayload<string>> = fc.record({
  vaultId: fc.uuid(),
  entries: fc.array(
    fc.record({
      entryId: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      username: fc.string({ minLength: 1, maxLength: 50 }),
      password: fc.string({ minLength: 1, maxLength: 128 }),
      siteUrl: fc.webUrl(),
      totpCode: fc.option(arbDigitString6, { nil: undefined }),
    }),
    { minLength: 0, maxLength: 5 },
  ),
});

const arbEntrySearchQuery: fc.Arbitrary<EntrySearchQuery> = fc.record({
  text: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
    nil: undefined,
  }),
  type: fc.option(arbVaultEntryType, { nil: undefined }),
  tags: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
      minLength: 0,
      maxLength: 5,
    }),
    { nil: undefined },
  ),
  favorite: fc.option(fc.boolean(), { nil: undefined }),
});

// --- Vault entry subtypes ---

const arbBaseFields = {
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  notes: fc.option(fc.string({ minLength: 0, maxLength: 200 }), {
    nil: undefined,
  }),
  tags: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
      minLength: 0,
      maxLength: 5,
    }),
    { nil: undefined },
  ),
  createdAt: arbDate,
  updatedAt: arbDate,
  favorite: fc.boolean(),
  attachments: fc.option(
    fc.array(arbAttachmentReference, { minLength: 0, maxLength: 3 }),
    { nil: undefined },
  ),
};

const arbLoginEntry: fc.Arbitrary<LoginEntry> = fc.record({
  ...arbBaseFields,
  type: fc.constant('login' as const),
  siteUrl: fc.webUrl(),
  username: fc.string({ minLength: 1, maxLength: 50 }),
  password: fc.string({ minLength: 1, maxLength: 128 }),
  totpSecret: fc.option(fc.base64String({ minLength: 16, maxLength: 32 }), {
    nil: undefined,
  }),
});

const arbSecureNoteEntry: fc.Arbitrary<SecureNoteEntry> = fc.record({
  ...arbBaseFields,
  type: fc.constant('secure_note' as const),
  content: fc.string({ minLength: 0, maxLength: 500 }),
});

const arbCreditCardEntry: fc.Arbitrary<CreditCardEntry> = fc.record({
  ...arbBaseFields,
  type: fc.constant('credit_card' as const),
  cardholderName: fc.string({ minLength: 1, maxLength: 100 }),
  cardNumber: fc.string({
    unit: digitChar,
    minLength: 13,
    maxLength: 19,
  }),
  expirationDate: fc
    .tuple(fc.integer({ min: 1, max: 12 }), fc.integer({ min: 24, max: 35 }))
    .map(([m, y]) => `${String(m).padStart(2, '0')}/${y}`),
  cvv: fc.string({ unit: digitChar, minLength: 3, maxLength: 4 }),
});

const arbIdentityEntry: fc.Arbitrary<IdentityEntry> = fc.record({
  ...arbBaseFields,
  type: fc.constant('identity' as const),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  email: fc.option(fc.emailAddress(), { nil: undefined }),
  phone: fc.option(fc.string({ minLength: 7, maxLength: 15 }), {
    nil: undefined,
  }),
  address: fc.option(fc.string({ minLength: 5, maxLength: 200 }), {
    nil: undefined,
  }),
});

const arbVaultEntry: fc.Arbitrary<VaultEntry> = fc.oneof(
  arbLoginEntry,
  arbSecureNoteEntry,
  arbCreditCardEntry,
  arbIdentityEntry,
);

const arbDecryptedVault: fc.Arbitrary<DecryptedVault> = fc.record({
  metadata: arbVaultMetadata,
  propertyRecords: fc.array(arbEntryPropertyRecord, {
    minLength: 0,
    maxLength: 3,
  }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 22: Shared interface JSON round-trip', () => {
  const opts = { numRuns: 100 };

  it('IPasswordGenerationOptions round-trips through JSON', () => {
    fc.assert(
      fc.property(arbPasswordGenerationOptions, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('IGeneratedPassword round-trips through JSON', () => {
    fc.assert(
      fc.property(arbGeneratedPassword, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('ITotpCode round-trips through JSON', () => {
    fc.assert(
      fc.property(arbTotpCode, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('ITotpValidation round-trips through JSON', () => {
    fc.assert(
      fc.property(arbTotpValidation, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('IBreachCheckResult round-trips through JSON', () => {
    fc.assert(
      fc.property(arbBreachCheckResult, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('IBrightPassError round-trips through JSON', () => {
    fc.assert(
      fc.property(arbBrightPassError, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('EmergencyAccessConfig round-trips through JSON', () => {
    fc.assert(
      fc.property(arbEmergencyAccessConfig, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('EntryPropertyRecord round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbEntryPropertyRecord, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('ImportResult round-trips through JSON', () => {
    fc.assert(
      fc.property(arbImportResult, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('AuditLogEntry round-trips through JSON (Date as ISO string)', () => {
    fc.assert(
      fc.property(arbAuditLogEntry, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('VaultMetadata round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbVaultMetadata, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('AutofillPayload round-trips through JSON', () => {
    fc.assert(
      fc.property(arbAutofillPayload, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('IDecryptedVault<string> round-trips through JSON', () => {
    fc.assert(
      fc.property(arbIDecryptedVault, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('IAutofillPayload<string> round-trips through JSON', () => {
    fc.assert(
      fc.property(arbIAutofillPayload, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('EntrySearchQuery round-trips through JSON', () => {
    fc.assert(
      fc.property(arbEntrySearchQuery, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('DecryptedVault round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbDecryptedVault, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('LoginEntry round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbLoginEntry, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('SecureNoteEntry round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbSecureNoteEntry, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('CreditCardEntry round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbCreditCardEntry, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('IdentityEntry round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbIdentityEntry, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });

  it('VaultEntry (all subtypes) round-trips through JSON (Dates as ISO strings)', () => {
    fc.assert(
      fc.property(arbVaultEntry, (obj) => {
        expect(jsonRoundTrip(obj)).toEqual(toJsonSafe(obj));
      }),
      opts,
    );
  });
});
