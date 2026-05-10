import fc from 'fast-check';
import { DeserializationError } from '../errors';
import type { IACLDocumentBase } from '../interfaces/bases/acl-document';
import type { IACLEntryBase } from '../interfaces/bases/acl-entry';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import { ACLDocumentSerializer } from '../serialization/acl-document-serializer';
import { FileMetadataSerializer } from '../serialization/file-metadata-serializer';

// ---------------------------------------------------------------------------
// Arbitraries — smart generators constrained to the valid input space
// ---------------------------------------------------------------------------

/** Common MIME types for realistic generation */
const mimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
  'application/json',
  'video/mp4',
  'audio/mpeg',
  'application/octet-stream',
];

/** Arbitrary ISO-8601 date string (normalized via Date round-trip) */
const arbDateString: fc.Arbitrary<string> = fc
  .integer({
    min: new Date('2000-01-01T00:00:00Z').getTime(),
    max: new Date('2099-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/** Arbitrary short alphanumeric ID (simulating string TID) */
const arbTID: fc.Arbitrary<string> = fc.stringMatching(/^[a-f0-9]{8,32}$/);

/** Arbitrary tag — short lowercase string */
const arbTag: fc.Arbitrary<string> = fc.stringMatching(/^[a-z0-9-]{1,20}$/);

/**
 * Arbitrary valid IFileMetadataBase<string> for binary serialization.
 * vaultCreationLedgerEntryHash is a real Uint8Array(64) for binary round-trip.
 * Date fields are ISO strings so the millisecond round-trip is lossless.
 */
const arbFileMetadata: fc.Arbitrary<IFileMetadataBase<string>> = fc.record({
  id: arbTID,
  ownerId: arbTID,
  vaultContainerId: arbTID,
  folderId: arbTID,
  fileName: fc.string({ minLength: 1, maxLength: 255 }),
  mimeType: fc.constantFrom(...mimeTypes),
  sizeBytes: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  tags: fc.array(arbTag, { minLength: 0, maxLength: 10 }),
  currentVersionId: arbTID,
  vaultCreationLedgerEntryHash: fc.uint8Array({
    minLength: 64,
    maxLength: 64,
  }),
  aclId: fc.option(arbTID, { nil: undefined }),
  deletedAt: fc.option(arbDateString, { nil: undefined }),
  deletedFromPath: fc.option(fc.string({ maxLength: 200 }), {
    nil: undefined,
  }),
  scheduledDestructionAt: fc.option(arbDateString, { nil: undefined }),
  approvalGoverned: fc.boolean(),
  visibleWatermark: fc.boolean(),
  invisibleWatermark: fc.boolean(),
  createdAt: arbDateString,
  updatedAt: arbDateString,
  createdBy: arbTID,
  updatedBy: arbTID,
});

/** Arbitrary ACL entry principal type */
const arbPrincipalType = fc.constantFrom<'user' | 'group' | 'share_link'>(
  'user',
  'group',
  'share_link',
);

/** Arbitrary HH:mm time string */
const arbTimeHHMM: fc.Arbitrary<string> = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  );

/** Arbitrary IANA timezone */
const arbTimezone = fc.constantFrom(
  'UTC',
  'America/New_York',
  'Europe/London',
  'Asia/Tokyo',
);

/** Arbitrary CIDR IP range */
const arbCIDR: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 32 }),
  )
  .map(([a, b, c, d, mask]) => `${a}.${b}.${c}.${d}/${mask}`);

/** Arbitrary valid IACLEntryBase<string> */
const arbACLEntry: fc.Arbitrary<IACLEntryBase<string>> = fc.record({
  principalType: arbPrincipalType,
  principalId: arbTID,
  permissionLevel: fc.constantFrom(
    'viewer',
    'commenter',
    'editor',
    'owner',
    'custom',
  ),
  customPermissionSetId: fc.option(arbTID, { nil: undefined }),
  canReshare: fc.boolean(),
  blockDownload: fc.boolean(),
  ipRange: fc.option(arbCIDR, { nil: undefined }),
  timeWindowStart: fc.option(arbTimeHHMM, { nil: undefined }),
  timeWindowEnd: fc.option(arbTimeHHMM, { nil: undefined }),
  timeWindowTimezone: fc.option(arbTimezone, { nil: undefined }),
  expiresAt: fc.option(arbDateString, { nil: undefined }),
});

/** Arbitrary valid IACLDocumentBase<string> with 0–20 entries */
const arbACLDocument: fc.Arbitrary<IACLDocumentBase<string>> = fc.record({
  id: arbTID,
  entries: fc.array(arbACLEntry, { minLength: 0, maxLength: 20 }),
  createdAt: arbDateString,
  updatedAt: arbDateString,
  updatedBy: arbTID,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compare two IFileMetadataBase<string> objects for equivalence after
 * binary round-trip. Date fields are compared as ISO strings (the serializer
 * normalizes via milliseconds). Uint8Array hash is compared element-wise.
 */
function expectFileMetadataEqual(
  result: IFileMetadataBase<string>,
  original: IFileMetadataBase<string>,
): void {
  expect(result.id).toBe(original.id);
  expect(result.ownerId).toBe(original.ownerId);
  expect(result.vaultContainerId).toBe(original.vaultContainerId);
  expect(result.folderId).toBe(original.folderId);
  expect(result.fileName).toBe(original.fileName);
  expect(result.mimeType).toBe(original.mimeType);
  expect(result.sizeBytes).toBe(original.sizeBytes);
  expect(result.description).toBe(original.description);
  expect(result.tags).toEqual(original.tags);
  expect(result.currentVersionId).toBe(original.currentVersionId);
  // Uint8Array comparison
  expect(result.vaultCreationLedgerEntryHash).toEqual(
    original.vaultCreationLedgerEntryHash,
  );
  expect(result.aclId).toBe(original.aclId);
  expect(result.deletedAt).toBe(original.deletedAt);
  expect(result.deletedFromPath).toBe(original.deletedFromPath);
  expect(result.scheduledDestructionAt).toBe(original.scheduledDestructionAt);
  expect(result.approvalGoverned).toBe(original.approvalGoverned);
  expect(result.visibleWatermark).toBe(original.visibleWatermark);
  expect(result.invisibleWatermark).toBe(original.invisibleWatermark);
  expect(result.createdAt).toBe(original.createdAt);
  expect(result.updatedAt).toBe(original.updatedAt);
  expect(result.createdBy).toBe(original.createdBy);
  expect(result.updatedBy).toBe(original.updatedBy);
}

/**
 * Compare two IACLDocumentBase<string> objects for equivalence after
 * binary round-trip.
 */
function expectACLDocumentEqual(
  result: IACLDocumentBase<string>,
  original: IACLDocumentBase<string>,
): void {
  expect(result.id).toBe(original.id);
  expect(result.createdAt).toBe(original.createdAt);
  expect(result.updatedAt).toBe(original.updatedAt);
  expect(result.updatedBy).toBe(original.updatedBy);
  expect(result.entries.length).toBe(original.entries.length);

  for (let i = 0; i < original.entries.length; i++) {
    const orig = original.entries[i];
    const rt = result.entries[i];
    expect(rt.principalType).toBe(orig.principalType);
    expect(rt.principalId).toBe(orig.principalId);
    expect(rt.permissionLevel).toBe(orig.permissionLevel);
    expect(rt.customPermissionSetId).toBe(orig.customPermissionSetId);
    expect(rt.canReshare).toBe(orig.canReshare);
    expect(rt.blockDownload).toBe(orig.blockDownload);
    expect(rt.ipRange).toBe(orig.ipRange);
    expect(rt.timeWindowStart).toBe(orig.timeWindowStart);
    expect(rt.timeWindowEnd).toBe(orig.timeWindowEnd);
    expect(rt.timeWindowTimezone).toBe(orig.timeWindowTimezone);
    expect(rt.expiresAt).toBe(orig.expiresAt);
  }
}

// ---------------------------------------------------------------------------
// Property Tests — Binary Serialization Round-Trip
// ---------------------------------------------------------------------------

describe('Binary Serialization Property Tests', () => {
  /**
   * Property 1: File_Metadata binary round-trip
   *
   * For all valid IFileMetadataBase<string> objects,
   * FileMetadataSerializer.deserialize(FileMetadataSerializer.serialize(m)) ≡ m
   *
   * **Validates: Requirements 32.2**
   */
  it('Property 1: File_Metadata binary round-trip', () => {
    fc.assert(
      fc.property(arbFileMetadata, (metadata) => {
        const serialized = FileMetadataSerializer.serialize(metadata);
        const deserialized = FileMetadataSerializer.deserialize(serialized);
        expectFileMetadataEqual(deserialized, metadata);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: ACL binary round-trip
   *
   * For all valid IACLDocumentBase<string> objects,
   * ACLDocumentSerializer.deserialize(ACLDocumentSerializer.serialize(a)) ≡ a
   *
   * **Validates: Requirements 33.2**
   */
  it('Property 2: ACL binary round-trip', () => {
    fc.assert(
      fc.property(arbACLDocument, (acl) => {
        const serialized = ACLDocumentSerializer.serialize(acl);
        const deserialized = ACLDocumentSerializer.deserialize(serialized);
        expectACLDocumentEqual(deserialized, acl);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 3: Corrupted payload detection
   *
   * Flipping any single bit in a serialized payload causes deserialization
   * to throw a DeserializationError (CRC mismatch or other corruption).
   * Tested for both FileMetadata and ACL serializers.
   *
   * **Validates: Requirements 32.3, 33.3**
   */
  it('Property 3: Corrupted payload detection — FileMetadata', () => {
    fc.assert(
      fc.property(
        arbFileMetadata,
        fc.nat(),
        fc.integer({ min: 0, max: 7 }),
        (metadata, byteIndexSeed, bitIndex) => {
          const serialized = FileMetadataSerializer.serialize(metadata);
          // Pick a random byte position within the payload
          const byteIndex = byteIndexSeed % serialized.length;
          // Create a corrupted copy
          const corrupted = new Uint8Array(serialized);
          corrupted[byteIndex] ^= 1 << bitIndex;
          // Deserialization should throw
          expect(() => FileMetadataSerializer.deserialize(corrupted)).toThrow(
            DeserializationError,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 3: Corrupted payload detection — ACL', () => {
    fc.assert(
      fc.property(
        arbACLDocument,
        fc.nat(),
        fc.integer({ min: 0, max: 7 }),
        (acl, byteIndexSeed, bitIndex) => {
          const serialized = ACLDocumentSerializer.serialize(acl);
          const byteIndex = byteIndexSeed % serialized.length;
          const corrupted = new Uint8Array(serialized);
          corrupted[byteIndex] ^= 1 << bitIndex;
          expect(() => ACLDocumentSerializer.deserialize(corrupted)).toThrow(
            DeserializationError,
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
