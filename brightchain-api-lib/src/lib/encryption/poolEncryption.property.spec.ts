/**
 * Property-based tests for Pool Encryption (Properties 30–34).
 *
 * Feature: architectural-gaps
 *
 * Tests cover encryption round-trip, block ID derivation from ciphertext,
 * key distribution to all members, key rotation preserving old block access,
 * and member removal triggering key rotation.
 */
import { describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import fc from 'fast-check';

import type { IPoolEncryptionConfig } from '@brightchain/brightchain-lib';
import { EncryptionMode } from '@brightchain/brightchain-lib';

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

/** Arbitrary non-empty Uint8Array for block data (1–512 bytes). */
const arbBlockData: fc.Arbitrary<Uint8Array> = fc
  .uint8Array({ minLength: 1, maxLength: 512 })
  .filter((arr) => arr.length > 0);

/** Arbitrary pool ID. */
const arbPoolId: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,20}$/,
);

/** Create a fresh PoolEncryptionService. */
function createService(): PoolEncryptionService {
  return new PoolEncryptionService();
}

/** Create a blank IPoolEncryptionConfig for pool-shared mode. */
function createEmptyConfig(poolId: string): IPoolEncryptionConfig {
  return {
    poolId,
    mode: EncryptionMode.PoolShared,
    searchableMetadataFields: [],
    keyVersions: [],
    currentKeyVersion: 0,
  };
}

// ---------------------------------------------------------------------------
// Property 30: Encryption round-trip
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 30: Encryption round-trip', () => {
  /**
   * **Validates: Requirements 14.2, 14.3**
   *
   * For any valid block data and any encryption mode (node-specific or pool-shared),
   * encrypting and then decrypting the data with the correct key should produce
   * data identical to the original.
   */
  it('node-specific ECIES round-trip preserves data', async () => {
    const service = createService();

    await fc.assert(
      fc.asyncProperty(arbBlockData, arbKeyPair, async (data, keyPair) => {
        const ciphertext = await service.encryptNodeSpecific(
          data,
          keyPair.publicKey,
        );
        const decrypted = await service.decryptNodeSpecific(
          ciphertext,
          keyPair.privateKey,
        );
        expect(Buffer.from(decrypted)).toEqual(Buffer.from(data));
      }),
      { numRuns: 100 },
    );
  });

  it('pool-shared AES-256-GCM round-trip preserves data', async () => {
    const service = createService();

    await fc.assert(
      fc.asyncProperty(arbBlockData, async (data) => {
        const sharedKey = service.generatePoolKey();
        const ciphertext = await service.encryptPoolShared(data, sharedKey);
        const decrypted = await service.decryptPoolShared(
          ciphertext,
          sharedKey,
        );
        expect(Buffer.from(decrypted)).toEqual(Buffer.from(data));
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 31: Block ID is hash of ciphertext
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 31: Block ID is hash of ciphertext', () => {
  /**
   * **Validates: Requirements 14.5**
   *
   * For any plaintext block data, the block ID assigned after encryption should
   * be the content hash of the encrypted (ciphertext) data, not the plaintext.
   * Encrypting the same plaintext twice (with different nonces) should produce
   * different block IDs.
   */
  it('block ID equals SHA-256 of ciphertext and differs across encryptions', async () => {
    const service = createService();

    await fc.assert(
      fc.asyncProperty(arbBlockData, async (data) => {
        const sharedKey = service.generatePoolKey();

        const ciphertext1 = await service.encryptPoolShared(data, sharedKey);
        const ciphertext2 = await service.encryptPoolShared(data, sharedKey);

        const blockId1 = service.computeBlockId(ciphertext1);
        const blockId2 = service.computeBlockId(ciphertext2);

        // Block ID must be the SHA-256 of the ciphertext
        const expectedId1 = crypto
          .createHash('sha256')
          .update(Buffer.from(ciphertext1))
          .digest('hex');
        const expectedId2 = crypto
          .createHash('sha256')
          .update(Buffer.from(ciphertext2))
          .digest('hex');

        expect(blockId1).toBe(expectedId1);
        expect(blockId2).toBe(expectedId2);

        // Different nonces → different ciphertexts → different block IDs
        expect(blockId1).not.toBe(blockId2);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 32: Key distribution to all members
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 32: Key distribution to all members', () => {
  /**
   * **Validates: Requirements 15.2, 15.3**
   *
   * For any pool-shared encrypted pool with N members, each member should be
   * able to decrypt the pool key using their own private key. After key rotation,
   * all current members should be able to decrypt the new key version, and the
   * old key version should remain in the key history.
   */
  it('every member can decrypt the pool key after init and rotation', async () => {
    const service = createService();

    // Generate 2–5 members (crypto ops are expensive, keep it bounded)
    const arbMembers = fc.array(arbKeyPair, { minLength: 2, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(arbPoolId, arbMembers, async (poolId, members) => {
        const config = createEmptyConfig(poolId);
        const manager = new PoolKeyManager(service, config);

        const publicKeys = members.map((m) => m.publicKey);

        // Initialize key version 1
        const configV1 = await manager.initializePoolKey(publicKeys);
        expect(configV1.currentKeyVersion).toBe(1);
        expect(configV1.keyVersions).toHaveLength(1);

        // Every member can decrypt version 1
        for (const member of members) {
          const key = await manager.getDecryptionKey(
            1,
            member.privateKey,
            member.nodeId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        }

        // Rotate to version 2
        const configV2 = await manager.rotateKey(publicKeys);
        expect(configV2.currentKeyVersion).toBe(2);
        expect(configV2.keyVersions).toHaveLength(2);

        // Every member can decrypt version 2
        for (const member of members) {
          const key = await manager.getDecryptionKey(
            2,
            member.privateKey,
            member.nodeId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        }

        // Old version 1 still in history and active
        const v1 = configV2.keyVersions.find((kv) => kv.version === 1);
        expect(v1).toBeDefined();
        expect(v1?.active).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 33: Key rotation preserves old block access
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 33: Key rotation preserves old block access', () => {
  /**
   * **Validates: Requirements 15.4**
   *
   * For any block encrypted with key version V, after rotating to key version V+1,
   * the block should still be decryptable using key version V from the key history.
   * New blocks should be encrypted with key version V+1.
   */
  it('blocks encrypted with old key remain decryptable after rotation', async () => {
    const service = createService();

    const arbMembers = fc.array(arbKeyPair, { minLength: 2, maxLength: 4 });

    await fc.assert(
      fc.asyncProperty(
        arbPoolId,
        arbMembers,
        arbBlockData,
        arbBlockData,
        async (poolId, members, dataV1, dataV2) => {
          const config = createEmptyConfig(poolId);
          const manager = new PoolKeyManager(service, config);
          const publicKeys = members.map((m) => m.publicKey);
          const member = members[0];

          // Initialize and get key V1
          await manager.initializePoolKey(publicKeys);
          const keyV1 = await manager.getCurrentEncryptionKey(
            member.privateKey,
            member.nodeId,
          );

          // Encrypt a block with V1
          const ciphertextV1 = await service.encryptPoolShared(dataV1, keyV1);

          // Rotate to V2
          await manager.rotateKey(publicKeys);
          const keyV2 = await manager.getCurrentEncryptionKey(
            member.privateKey,
            member.nodeId,
          );

          // Encrypt a new block with V2
          const ciphertextV2 = await service.encryptPoolShared(dataV2, keyV2);

          // Old block still decryptable with V1 key from history
          const oldKey = await manager.getDecryptionKey(
            1,
            member.privateKey,
            member.nodeId,
          );
          const decryptedV1 = await service.decryptPoolShared(
            ciphertextV1,
            oldKey,
          );
          expect(Buffer.from(decryptedV1)).toEqual(Buffer.from(dataV1));

          // New block decryptable with V2 key
          const decryptedV2 = await service.decryptPoolShared(
            ciphertextV2,
            keyV2,
          );
          expect(Buffer.from(decryptedV2)).toEqual(Buffer.from(dataV2));

          // V1 and V2 keys are different
          expect(Buffer.from(keyV1)).not.toEqual(Buffer.from(keyV2));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 34: Member removal triggers key rotation
// ---------------------------------------------------------------------------

describe('Feature: architectural-gaps, Property 34: Member removal triggers key rotation', () => {
  /**
   * **Validates: Requirements 15.5**
   *
   * For any pool-shared encrypted pool, removing a member should increment the
   * current key version. The removed member's entry should not appear in the
   * new key version's encrypted keys.
   */
  it('removing a member increments key version and excludes them', async () => {
    const service = createService();

    // Need at least 3 members so we can remove one and still have ≥2
    const arbMembers = fc.array(arbKeyPair, { minLength: 3, maxLength: 5 });

    await fc.assert(
      fc.asyncProperty(arbPoolId, arbMembers, async (poolId, members) => {
        const config = createEmptyConfig(poolId);
        const manager = new PoolKeyManager(service, config);
        const publicKeys = members.map((m) => m.publicKey);

        // Initialize
        await manager.initializePoolKey(publicKeys);
        const versionBefore = manager.getConfig().currentKeyVersion;

        // Remove the last member
        const removedMember = members[members.length - 1];
        const remainingPublicKeys = members
          .slice(0, -1)
          .map((m) => m.publicKey);

        const configAfter = await manager.removeMember(
          removedMember.nodeId,
          remainingPublicKeys,
        );

        // Key version incremented
        expect(configAfter.currentKeyVersion).toBe(versionBefore + 1);

        // New key version exists
        const newVersion = configAfter.keyVersions.find(
          (kv) => kv.version === configAfter.currentKeyVersion,
        );
        expect(newVersion).toBeDefined();

        // Removed member not in new version's encrypted keys
        const removedEntry = newVersion?.encryptedKeys?.find(
          (ek) => ek.nodeId === removedMember.nodeId,
        );
        expect(removedEntry).toBeUndefined();

        // Remaining members ARE in the new version
        for (const member of members.slice(0, -1)) {
          const entry = newVersion?.encryptedKeys?.find(
            (ek) => ek.nodeId === member.nodeId,
          );
          expect(entry).toBeDefined();
        }

        // Remaining members can decrypt the new key
        for (const member of members.slice(0, -1)) {
          const key = await manager.getDecryptionKey(
            configAfter.currentKeyVersion,
            member.privateKey,
            member.nodeId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        }
      }),
      { numRuns: 100 },
    );
  });
});
