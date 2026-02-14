/**
 * Property-based tests for Encrypted Metadata and Replication (Properties 35–38).
 *
 * Feature: architectural-gaps
 *
 * Tests cover:
 * - Block IDs always unencrypted (Property 35)
 * - Encrypted metadata field access control (Property 36)
 * - Replication allowed by encryption mode (Property 37)
 * - Encrypted parity blocks (Property 38)
 */
import { describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import fc from 'fast-check';

import type {
  ICBLIndexEntry,
  IPoolEncryptionConfig,
} from '@brightchain/brightchain-lib';
import { CBLVisibility, EncryptionMode } from '@brightchain/brightchain-lib';

import { EncryptedMetadataService } from './encryptedMetadataService';
import { EncryptionAwareReplication } from './encryptionAwareReplication';
import { EncryptedFieldError, ReplicationNotAllowedError } from './errors';
import { PoolEncryptionService } from './poolEncryptionService';
import { PoolKeyManager } from './poolKeyManager';

// ---------------------------------------------------------------------------
// Helpers & Arbitraries
// ---------------------------------------------------------------------------

interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  nodeId: string;
}

function generateKeyPair(): KeyPair {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  const publicKey = new Uint8Array(ecdh.getPublicKey(undefined, 'compressed'));
  const privateKey = new Uint8Array(ecdh.getPrivateKey());
  const nodeId = crypto
    .createHash('sha256')
    .update(Buffer.from(publicKey))
    .digest('hex');
  return { privateKey, publicKey, nodeId };
}

/** Arbitrary that produces a fresh secp256k1 key pair per sample. */
const arbKeyPair: fc.Arbitrary<KeyPair> = fc
  .constant(null)
  .map(() => generateKeyPair());

/** Arbitrary pool ID matching the PoolId pattern. */
const arbPoolId: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,20}$/,
);

/** Arbitrary non-empty Uint8Array for parity data (1–256 bytes). */
const arbParityData: fc.Arbitrary<Uint8Array> = fc
  .uint8Array({ minLength: 1, maxLength: 256 })
  .filter((arr) => arr.length > 0);

/** Arbitrary hex string of a given length (for block IDs). */
const arbHexId: fc.Arbitrary<string> = fc
  .uint8Array({ minLength: 16, maxLength: 16 })
  .map((arr) => Buffer.from(arr).toString('hex'));

/** Arbitrary magnet URL. */
const arbMagnetUrl: fc.Arbitrary<string> = fc
  .tuple(arbHexId, arbHexId, fc.integer({ min: 64, max: 4096 }))
  .map(
    ([b1, b2, bs]) =>
      `magnet:?xt=urn:brightchain:cbl&bs=${bs}&b1=${b1}&b2=${b2}`,
  );

/** Arbitrary file name. */
const arbFileName: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z]{1,10}$/),
    fc.constantFrom('.txt', '.pdf', '.png', '.doc'),
  )
  .map(([name, ext]) => name + ext);

/** Arbitrary MIME type. */
const arbMimeType: fc.Arbitrary<string> = fc.constantFrom(
  'text/plain',
  'application/pdf',
  'image/png',
  'application/octet-stream',
);

/** Arbitrary tags array. */
const arbTags: fc.Arbitrary<string[]> = fc.array(
  fc.stringMatching(/^[a-z]{1,8}$/),
  { minLength: 0, maxLength: 3 },
);

/** Arbitrary user collection name. */
const arbUserCollection: fc.Arbitrary<string> =
  fc.stringMatching(/^[a-z ]{1,15}$/);

/** Arbitrary CBL visibility. */
const arbVisibility: fc.Arbitrary<CBLVisibility> = fc.constantFrom(
  CBLVisibility.Private,
  CBLVisibility.Shared,
  CBLVisibility.Public,
);

/** Generate a complete ICBLIndexEntry with all fields populated. */
const arbCBLIndexEntry: fc.Arbitrary<ICBLIndexEntry> = fc
  .tuple(
    arbHexId,
    arbMagnetUrl,
    arbHexId,
    arbHexId,
    fc.integer({ min: 64, max: 4096 }),
    arbPoolId,
    arbVisibility,
    fc.integer({ min: 1, max: 10000 }),
    arbFileName,
    arbMimeType,
    fc.integer({ min: 1, max: 10000000 }),
    arbTags,
    arbUserCollection,
  )
  .map(
    ([
      id,
      magnetUrl,
      blockId1,
      blockId2,
      blockSize,
      poolId,
      visibility,
      sequenceNumber,
      fileName,
      mimeType,
      originalSize,
      tags,
      userCollection,
    ]) => ({
      _id: id,
      magnetUrl,
      blockId1,
      blockId2,
      blockSize,
      poolId,
      createdAt: new Date('2025-01-15T10:00:00Z'),
      createdBy: 'test-user',
      visibility,
      sequenceNumber,
      metadata: {
        fileName,
        mimeType,
        originalSize,
        tags,
      },
      userCollection,
    }),
  );

/** Subset of ENCRYPTABLE_FIELDS for generating searchable field configs. */
const ALL_ENCRYPTABLE_FIELDS: string[] = [
  'metadata.fileName',
  'metadata.mimeType',
  'metadata.originalSize',
  'metadata.tags',
  'userCollection',
  'fileId',
  'versionNumber',
  'previousVersion',
];

/** Fields that are always unencrypted. */
const ALWAYS_UNENCRYPTED: string[] = [
  '_id',
  'magnetUrl',
  'blockId1',
  'blockId2',
  'blockSize',
  'poolId',
  'createdAt',
  'sequenceNumber',
  'visibility',
  'createdBy',
];

/** Arbitrary subset of encryptable fields to mark as searchable. */
const arbSearchableFields: fc.Arbitrary<string[]> = fc.subarray(
  ALL_ENCRYPTABLE_FIELDS,
  { minLength: 0, maxLength: ALL_ENCRYPTABLE_FIELDS.length },
);

/** Create a pool encryption config for a given mode and searchable fields. */
function createConfig(
  poolId: string,
  mode: EncryptionMode,
  searchableMetadataFields: string[] = [],
): IPoolEncryptionConfig {
  return {
    poolId,
    mode,
    searchableMetadataFields,
    keyVersions: [],
    currentKeyVersion: 0,
  };
}

/** Create a fresh PoolEncryptionService. */
function createService(): PoolEncryptionService {
  return new PoolEncryptionService();
}

// ---------------------------------------------------------------------------
// Property 35: Block IDs always unencrypted
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 35: Block IDs always unencrypted', () => {
  /**
   * **Validates: Requirements 16.2**
   *
   * For any encryption mode and any block, the block ID (checksum) should
   * always be readable and usable for lookups, Bloom filter membership,
   * and has() checks, regardless of whether the block content is encrypted.
   *
   * After encrypting metadata on a CBL index entry, the _id, magnetUrl,
   * blockId1, blockId2, blockSize, poolId, createdAt, and sequenceNumber
   * fields remain unchanged (unencrypted).
   */
  it('structural fields survive metadata encryption unchanged', async () => {
    const service = createService();

    await fc.assert(
      fc.asyncProperty(
        arbCBLIndexEntry,
        arbPoolId,
        arbSearchableFields,
        async (entry, poolId, searchableFields) => {
          const config = createConfig(
            poolId,
            EncryptionMode.PoolShared,
            searchableFields,
          );
          const metadataService = new EncryptedMetadataService(service, config);
          const poolKey = service.generatePoolKey();

          const encrypted = await metadataService.encryptMetadata(
            entry,
            poolKey,
          );

          // All always-unencrypted fields must be identical
          expect(encrypted._id).toBe(entry._id);
          expect(encrypted.magnetUrl).toBe(entry.magnetUrl);
          expect(encrypted.blockId1).toBe(entry.blockId1);
          expect(encrypted.blockId2).toBe(entry.blockId2);
          expect(encrypted.blockSize).toBe(entry.blockSize);
          expect(encrypted.poolId).toBe(entry.poolId);
          expect(encrypted.createdAt).toEqual(entry.createdAt);
          expect(encrypted.sequenceNumber).toBe(entry.sequenceNumber);
          expect(encrypted.visibility).toBe(entry.visibility);
          expect(encrypted.createdBy).toBe(entry.createdBy);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 36: Encrypted metadata field access control
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 36: Encrypted metadata field access control', () => {
  /**
   * **Validates: Requirements 16.3, 16.4, 16.5**
   *
   * For any encrypted pool with a configured set of searchable metadata fields:
   * - Querying by a searchable field returns results normally (no throw)
   * - Querying by a non-searchable (encrypted) field throws EncryptedFieldError
   * - isContentIndexingAllowed() returns false for encrypted pools, true for none
   * - After encryptMetadata, non-searchable fields are moved to encryptedFields
   * - After decryptMetadata, original values are restored
   */
  it('validates query access, content indexing, and encrypt/decrypt round-trip', async () => {
    const service = createService();

    await fc.assert(
      fc.asyncProperty(
        arbCBLIndexEntry,
        arbPoolId,
        arbSearchableFields,
        async (entry, poolId, searchableFields) => {
          // --- Encrypted pool (PoolShared) ---
          const encConfig = createConfig(
            poolId,
            EncryptionMode.PoolShared,
            searchableFields,
          );
          const encService = new EncryptedMetadataService(service, encConfig);
          const poolKey = service.generatePoolKey();

          // Always-unencrypted fields should not throw
          for (const field of ALWAYS_UNENCRYPTED) {
            expect(() => encService.validateQuery([field])).not.toThrow();
          }

          // Configured searchable fields should not throw
          for (const field of searchableFields) {
            expect(() => encService.validateQuery([field])).not.toThrow();
          }

          // Non-searchable encryptable fields SHOULD throw
          const nonSearchable = ALL_ENCRYPTABLE_FIELDS.filter(
            (f) => !searchableFields.includes(f),
          );
          for (const field of nonSearchable) {
            expect(() => encService.validateQuery([field])).toThrow(
              EncryptedFieldError,
            );
          }

          // Content indexing not allowed for encrypted pools
          expect(encService.isContentIndexingAllowed()).toBe(false);

          // --- Unencrypted pool (None) ---
          const noneConfig = createConfig(poolId, EncryptionMode.None, []);
          const noneService = new EncryptedMetadataService(service, noneConfig);
          expect(noneService.isContentIndexingAllowed()).toBe(true);

          // --- Encrypt/decrypt round-trip ---
          const encrypted = await encService.encryptMetadata(entry, poolKey);

          // Non-searchable fields should be in encryptedFields map
          for (const field of nonSearchable) {
            const originalValue = getFieldValue(entry, field);
            if (originalValue !== undefined) {
              expect(encrypted.encryptedFields).toBeDefined();
              expect(encrypted.encryptedFields![field]).toBeDefined();
            }
          }

          // Decrypt and verify round-trip
          const decrypted = await encService.decryptMetadata(
            encrypted,
            poolKey,
          );

          // All original values should be restored
          if (entry.metadata?.fileName !== undefined) {
            expect(decrypted.metadata?.fileName).toBe(entry.metadata.fileName);
          }
          if (entry.metadata?.mimeType !== undefined) {
            expect(decrypted.metadata?.mimeType).toBe(entry.metadata.mimeType);
          }
          if (entry.metadata?.originalSize !== undefined) {
            expect(decrypted.metadata?.originalSize).toBe(
              entry.metadata.originalSize,
            );
          }
          if (entry.metadata?.tags !== undefined) {
            expect(decrypted.metadata?.tags).toEqual(entry.metadata.tags);
          }
          if (entry.userCollection !== undefined) {
            expect(decrypted.userCollection).toBe(entry.userCollection);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Helper to get a field value from a CBL index entry by dot-notation path.
 */
function getFieldValue(entry: ICBLIndexEntry, fieldPath: string): unknown {
  const parts = fieldPath.split('.');
  if (parts.length === 1) {
    return entry[fieldPath as keyof ICBLIndexEntry];
  }
  if (parts.length === 2 && parts[0] === 'metadata' && entry.metadata) {
    return entry.metadata[parts[1] as keyof typeof entry.metadata];
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Property 37: Replication allowed by encryption mode
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 37: Replication allowed by encryption mode', () => {
  /**
   * **Validates: Requirements 17.1, 17.2**
   *
   * For any pool, replication of encrypted blocks should be allowed if and
   * only if the encryption mode is `pool-shared` or `none`. Pools with
   * `node-specific` encryption should block replication.
   */
  it('canReplicate and validateReplication respect encryption mode', () => {
    const service = createService();

    const arbMode: fc.Arbitrary<EncryptionMode> = fc.constantFrom(
      EncryptionMode.None,
      EncryptionMode.PoolShared,
      EncryptionMode.NodeSpecific,
    );

    fc.assert(
      fc.property(arbPoolId, arbMode, (poolId, mode) => {
        const config = createConfig(poolId, mode);
        const keyManager = new PoolKeyManager(service, config);
        const replication = new EncryptionAwareReplication(
          config,
          keyManager,
          service,
        );

        if (mode === EncryptionMode.NodeSpecific) {
          // Node-specific: replication NOT allowed
          expect(replication.canReplicate()).toBe(false);
          expect(() => replication.validateReplication()).toThrow(
            ReplicationNotAllowedError,
          );
        } else {
          // None or PoolShared: replication allowed
          expect(replication.canReplicate()).toBe(true);
          expect(() => replication.validateReplication()).not.toThrow();
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 38: Encrypted parity blocks
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 38: Encrypted parity blocks', () => {
  /**
   * **Validates: Requirements 17.5**
   *
   * For any block encrypted with node-specific encryption that has FEC parity
   * blocks, the parity blocks should also be encrypted with the same node key.
   * Decrypting a parity block with the node key should produce valid parity data.
   */
  it('parity blocks encrypted with node key round-trip correctly', async () => {
    const service = createService();

    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbKeyPair,
        arbParityData,
        async (poolId, keyPair, parityData) => {
          const config = createConfig(poolId, EncryptionMode.NodeSpecific);
          const keyManager = new PoolKeyManager(service, config);
          const replication = new EncryptionAwareReplication(
            config,
            keyManager,
            service,
          );

          // Node-specific mode should require parity encryption
          expect(replication.shouldEncryptParity()).toBe(true);

          // Encrypt the parity block
          const encryptedParity = await replication.encryptParityBlock(
            parityData,
            keyPair.publicKey,
          );

          // Encrypted parity should differ from original
          expect(Buffer.from(encryptedParity)).not.toEqual(
            Buffer.from(parityData),
          );

          // Decrypt with the node's private key
          const decryptedParity = await service.decryptNodeSpecific(
            encryptedParity,
            keyPair.privateKey,
          );

          // Round-trip: decrypted parity must equal original
          expect(Buffer.from(decryptedParity)).toEqual(Buffer.from(parityData));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-node-specific modes do not require parity encryption', () => {
    const service = createService();

    const arbNonNodeMode: fc.Arbitrary<EncryptionMode> = fc.constantFrom(
      EncryptionMode.None,
      EncryptionMode.PoolShared,
    );

    fc.assert(
      fc.property(arbPoolId, arbNonNodeMode, (poolId, mode) => {
        const config = createConfig(poolId, mode);
        const keyManager = new PoolKeyManager(service, config);
        const replication = new EncryptionAwareReplication(
          config,
          keyManager,
          service,
        );

        expect(replication.shouldEncryptParity()).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
