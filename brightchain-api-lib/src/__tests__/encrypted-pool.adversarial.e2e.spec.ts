/**
 * @fileoverview Adversarial E2E tests for Private Encrypted Pools (Phase 4).
 *
 * NO MOCKS. Real ECDSA keys, real AES-256-GCM encryption, real ECIES key wrapping.
 * Tests that encrypted pools correctly protect data confidentiality and
 * that key rotation excludes removed members.
 *
 * @see .kiro/specs/member-pool-security/tasks.md — Task 4.3
 */

import * as crypto from 'crypto';
import { EncryptedPoolKeyManager } from '../lib/services/encryptedPoolService';

function generateKeyPair() {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
    publicKey: new Uint8Array(ecdh.getPublicKey(undefined, 'compressed')),
  };
}

const POOL_ID = 'test-private-pool';

describe('Encrypted Pool — Adversarial E2E Tests', () => {
  const admin = generateKeyPair();
  const member1 = generateKeyPair();
  const member2 = generateKeyPair();
  const attacker = generateKeyPair();

  // ── Test: Non-member cannot read ─────────────────────────────────

  it('non-member cannot decrypt pool data without the pool key', async () => {
    const manager = new EncryptedPoolKeyManager();
    await manager.createPool(POOL_ID, admin.publicKey, 'admin-node');

    // Admin encrypts data
    const plaintext = new TextEncoder().encode('secret document content');
    const _ciphertext = await manager.encrypt(plaintext);

    // Attacker tries to decrypt with their own key — they don't have the pool key
    const attackerManager = new EncryptedPoolKeyManager();

    // Attacker can't load the pool because their key isn't in the encrypted keys list
    const config = manager.getConfig()!;
    await expect(
      attackerManager.loadPool(config, attacker.privateKey, 'attacker-node'),
    ).rejects.toThrow(/No encrypted key found/);
  });

  // ── Test: Member can read after being added ──────────────────────

  it('added member can decrypt pool data', async () => {
    const manager = new EncryptedPoolKeyManager();
    await manager.createPool(POOL_ID, admin.publicKey, 'admin-node');

    // Add member1
    await manager.addMember(member1.publicKey, 'member1-node');

    // Admin encrypts data
    const plaintext = new TextEncoder().encode('shared secret');
    const ciphertext = await manager.encrypt(plaintext);

    // Member1 loads the pool and decrypts
    const member1Manager = new EncryptedPoolKeyManager();
    await member1Manager.loadPool(
      manager.getConfig()!,
      member1.privateKey,
      'member1-node',
    );

    const decrypted = await member1Manager.decrypt(ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('shared secret');
  });

  // ── Test: Key rotation excludes removed member ───────────────────

  it('removed member cannot decrypt data written after key rotation', async () => {
    const manager = new EncryptedPoolKeyManager();
    await manager.createPool(POOL_ID, admin.publicKey, 'admin-node');

    // Add both members
    await manager.addMember(member1.publicKey, 'member1-node');
    await manager.addMember(member2.publicKey, 'member2-node');

    // Encrypt data BEFORE rotation — both members can read
    const preRotationData = new TextEncoder().encode('before rotation');
    const preRotationCiphertext = await manager.encrypt(preRotationData);

    // Member1 loads and can decrypt pre-rotation data
    const member1PreRotation = new EncryptedPoolKeyManager();
    await member1PreRotation.loadPool(
      manager.getConfig()!,
      member1.privateKey,
      'member1-node',
    );
    const decryptedPre = await member1PreRotation.decrypt(
      preRotationCiphertext,
    );
    expect(new TextDecoder().decode(decryptedPre)).toBe('before rotation');

    // Remove member1 and rotate key — only admin and member2 remain
    await manager.removeMemberAndRotateKey('member1-node', [
      { publicKey: admin.publicKey, nodeId: 'admin-node' },
      { publicKey: member2.publicKey, nodeId: 'member2-node' },
    ]);

    // Encrypt data AFTER rotation
    const postRotationData = new TextEncoder().encode('after rotation');
    const postRotationCiphertext = await manager.encrypt(postRotationData);

    // Member2 can decrypt post-rotation data
    const member2Manager = new EncryptedPoolKeyManager();
    await member2Manager.loadPool(
      manager.getConfig()!,
      member2.privateKey,
      'member2-node',
    );
    const decryptedPost = await member2Manager.decrypt(postRotationCiphertext);
    expect(new TextDecoder().decode(decryptedPost)).toBe('after rotation');

    // Member1 CANNOT load the new key version — they're not in it
    const member1PostRotation = new EncryptedPoolKeyManager();
    await expect(
      member1PostRotation.loadPool(
        manager.getConfig()!,
        member1.privateKey,
        'member1-node',
      ),
    ).rejects.toThrow(/No encrypted key found/);
  });

  // ── Test: Old data still readable after rotation ─────────────────

  it('remaining members can still read old data with old key version', async () => {
    const manager = new EncryptedPoolKeyManager();
    await manager.createPool(POOL_ID, admin.publicKey, 'admin-node');
    await manager.addMember(member1.publicKey, 'member1-node');

    // Encrypt with key version 1
    const oldData = new TextEncoder().encode('old data v1');
    const oldCiphertext = await manager.encrypt(oldData);

    // Rotate key (remove member1)
    await manager.removeMemberAndRotateKey('member1-node', [
      { publicKey: admin.publicKey, nodeId: 'admin-node' },
    ]);

    // Admin can still decrypt old data using version 1
    const _config = manager.getConfig()!;
    const decrypted = await manager.decryptWithVersion(
      oldCiphertext,
      1, // old key version
      admin.privateKey,
      'admin-node',
    );
    expect(new TextDecoder().decode(decrypted)).toBe('old data v1');
  });

  // ── Test: Tampered ciphertext detected ───────────────────────────

  it('tampered ciphertext is rejected by AES-GCM auth tag', async () => {
    const manager = new EncryptedPoolKeyManager();
    await manager.createPool(POOL_ID, admin.publicKey, 'admin-node');

    const plaintext = new TextEncoder().encode('integrity check');
    const ciphertext = await manager.encrypt(plaintext);

    // Tamper with the ciphertext (flip a byte in the encrypted data portion)
    const tampered = new Uint8Array(ciphertext);
    tampered[tampered.length - 1] ^= 0xff;

    // Decryption should fail due to auth tag mismatch
    await expect(manager.decrypt(tampered)).rejects.toThrow();
  });

  // ── Test: Wrong key cannot decrypt ───────────────────────────────

  it('data encrypted with one pool key cannot be decrypted with another', async () => {
    // Create two separate pools with different keys
    const pool1 = new EncryptedPoolKeyManager();
    await pool1.createPool('pool-1', admin.publicKey, 'admin-node');

    const pool2 = new EncryptedPoolKeyManager();
    await pool2.createPool('pool-2', admin.publicKey, 'admin-node');

    // Encrypt with pool1's key
    const plaintext = new TextEncoder().encode('pool1 data');
    const ciphertext = await pool1.encrypt(plaintext);

    // Try to decrypt with pool2's key — should fail
    await expect(pool2.decrypt(ciphertext)).rejects.toThrow();
  });

  // ── Test: Multiple key versions tracked ──────────────────────────

  it('key rotation creates new version and marks old as inactive', async () => {
    const manager = new EncryptedPoolKeyManager();
    await manager.createPool(POOL_ID, admin.publicKey, 'admin-node');
    await manager.addMember(member1.publicKey, 'member1-node');

    const config1 = manager.getConfig()!;
    expect(config1.currentKeyVersion).toBe(1);
    expect(config1.keyVersions).toHaveLength(1);
    expect(config1.keyVersions[0].active).toBe(true);

    // Rotate
    await manager.removeMemberAndRotateKey('member1-node', [
      { publicKey: admin.publicKey, nodeId: 'admin-node' },
    ]);

    const config2 = manager.getConfig()!;
    expect(config2.currentKeyVersion).toBe(2);
    expect(config2.keyVersions).toHaveLength(2);
    expect(config2.keyVersions[0].active).toBe(false); // v1 inactive
    expect(config2.keyVersions[1].active).toBe(true); // v2 active
  });
});
