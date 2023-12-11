/**
 * @fileoverview Encrypted Pool Service
 *
 * Manages private encrypted pools with PoolShared encryption.
 * Handles pool key generation, per-member ECIES key wrapping,
 * key rotation on member removal, and encrypted read/write.
 *
 * @see .kiro/specs/member-pool-security/tasks.md — Phase 4
 */

import {
  EncryptionMode,
  type IKeyVersion,
  type IPoolEncryptionConfig,
  type PoolId,
} from '@brightchain/brightchain-lib';
import { PoolEncryptionService } from '../encryption/poolEncryptionService';

/**
 * Manages the lifecycle of an encrypted pool's key material.
 */
export class EncryptedPoolKeyManager {
  private readonly encryptionService = new PoolEncryptionService();
  private poolKey: Uint8Array | null = null;
  private config: IPoolEncryptionConfig<string> | null = null;

  /**
   * Create a new encrypted pool with a fresh AES-256 key.
   * The key is ECIES-encrypted for the initial admin member.
   *
   * @param poolId - The pool identifier
   * @param adminPublicKey - The admin's secp256k1 public key (compressed)
   * @param adminNodeId - The admin's node ID (string)
   * @returns The pool encryption config with the encrypted key
   */
  async createPool(
    poolId: string,
    adminPublicKey: Uint8Array,
    adminNodeId: string,
  ): Promise<IPoolEncryptionConfig<string>> {
    // Generate a random 256-bit pool key
    const poolKey = this.encryptionService.generatePoolKey();
    this.poolKey = poolKey;

    // Encrypt the key for the admin
    const encryptedKey = await this.encryptionService.encryptKeyForMember(
      poolKey,
      adminPublicKey,
    );

    const now = new Date();
    const keyVersion: IKeyVersion<string> = {
      version: 1,
      createdAt: now,
      encryptedKeys: [
        {
          nodeId: adminNodeId,
          encryptedKey,
        },
      ],
      active: true,
    };

    this.config = {
      poolId: poolId as PoolId,
      mode: EncryptionMode.PoolShared,
      searchableMetadataFields: [],
      keyVersions: [keyVersion],
      currentKeyVersion: 1,
    };

    return this.config;
  }

  /**
   * Load an existing pool's encryption config and decrypt the pool key.
   *
   * @param config - The pool encryption config
   * @param memberPrivateKey - The member's private key to decrypt the pool key
   * @param memberNodeId - The member's node ID to find their encrypted key
   */
  async loadPool(
    config: IPoolEncryptionConfig<string>,
    memberPrivateKey: Uint8Array,
    memberNodeId: string,
  ): Promise<void> {
    this.config = config;

    // Find the current key version
    const currentVersion = config.keyVersions.find(
      (kv) => kv.version === config.currentKeyVersion && kv.active,
    );
    if (!currentVersion?.encryptedKeys) {
      throw new Error('No active key version found');
    }

    // Find this member's encrypted key
    const memberKey = currentVersion.encryptedKeys.find(
      (ek) => ek.nodeId === memberNodeId,
    );
    if (!memberKey) {
      throw new Error(
        `No encrypted key found for member ${memberNodeId} in key version ${currentVersion.version}`,
      );
    }

    // Decrypt the pool key
    this.poolKey = await this.encryptionService.decryptKeyForMember(
      memberKey.encryptedKey,
      memberPrivateKey,
    );
  }

  /**
   * Add a new member to the pool by encrypting the pool key for them.
   *
   * @param memberPublicKey - The new member's public key
   * @param memberNodeId - The new member's node ID
   * @returns Updated pool encryption config
   */
  async addMember(
    memberPublicKey: Uint8Array,
    memberNodeId: string,
  ): Promise<IPoolEncryptionConfig<string>> {
    if (!this.poolKey || !this.config) {
      throw new Error('Pool not initialized');
    }

    const encryptedKey = await this.encryptionService.encryptKeyForMember(
      this.poolKey,
      memberPublicKey,
    );

    // Add to current key version
    const currentVersion = this.config.keyVersions.find(
      (kv) => kv.version === this.config!.currentKeyVersion,
    );
    if (!currentVersion?.encryptedKeys) {
      throw new Error('No active key version');
    }

    currentVersion.encryptedKeys.push({
      nodeId: memberNodeId,
      encryptedKey,
    });

    return this.config;
  }

  /**
   * Remove a member and rotate the pool key.
   * Generates a new key, encrypts it for all remaining members,
   * and marks the old key version as inactive.
   *
   * @param removedNodeId - The removed member's node ID
   * @param remainingMembers - Array of remaining members' public keys and node IDs
   * @returns Updated pool encryption config with new key version
   */
  async removeMemberAndRotateKey(
    removedNodeId: string,
    remainingMembers: Array<{
      publicKey: Uint8Array;
      nodeId: string;
    }>,
  ): Promise<IPoolEncryptionConfig<string>> {
    if (!this.config) {
      throw new Error('Pool not initialized');
    }

    // Generate new pool key
    const newPoolKey = this.encryptionService.generatePoolKey();

    // Encrypt for all remaining members
    const encryptedKeys: Array<{
      nodeId: string;
      encryptedKey: Uint8Array;
    }> = [];

    for (const member of remainingMembers) {
      const encryptedKey = await this.encryptionService.encryptKeyForMember(
        newPoolKey,
        member.publicKey,
      );
      encryptedKeys.push({
        nodeId: member.nodeId,
        encryptedKey,
      });
    }

    // Mark old key version as inactive
    for (const kv of this.config.keyVersions) {
      if (kv.version === this.config.currentKeyVersion) {
        kv.active = false;
      }
    }

    // Add new key version
    const newVersion: IKeyVersion<string> = {
      version: this.config.currentKeyVersion + 1,
      createdAt: new Date(),
      encryptedKeys,
      active: true,
    };

    this.config.keyVersions.push(newVersion);
    this.config.currentKeyVersion = newVersion.version;
    this.poolKey = newPoolKey;

    return this.config;
  }

  /**
   * Encrypt data with the current pool key.
   */
  async encrypt(data: Uint8Array): Promise<Uint8Array> {
    if (!this.poolKey) {
      throw new Error(
        'Pool key not available — call createPool or loadPool first',
      );
    }
    return this.encryptionService.encryptPoolShared(data, this.poolKey);
  }

  /**
   * Decrypt data with the current pool key.
   */
  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    if (!this.poolKey) {
      throw new Error(
        'Pool key not available — call createPool or loadPool first',
      );
    }
    return this.encryptionService.decryptPoolShared(ciphertext, this.poolKey);
  }

  /**
   * Decrypt data with a specific key version (for reading old data after rotation).
   *
   * @param ciphertext - The encrypted data
   * @param keyVersion - The key version number to use
   * @param memberPrivateKey - The member's private key
   * @param memberNodeId - The member's node ID
   */
  async decryptWithVersion(
    ciphertext: Uint8Array,
    keyVersion: number,
    memberPrivateKey: Uint8Array,
    memberNodeId: string,
  ): Promise<Uint8Array> {
    if (!this.config) {
      throw new Error('Pool not initialized');
    }

    const kv = this.config.keyVersions.find((v) => v.version === keyVersion);
    if (!kv?.encryptedKeys) {
      throw new Error(`Key version ${keyVersion} not found`);
    }

    const memberKey = kv.encryptedKeys.find((ek) => ek.nodeId === memberNodeId);
    if (!memberKey) {
      throw new Error(
        `No encrypted key for member ${memberNodeId} in version ${keyVersion}`,
      );
    }

    const poolKey = await this.encryptionService.decryptKeyForMember(
      memberKey.encryptedKey,
      memberPrivateKey,
    );

    return this.encryptionService.decryptPoolShared(ciphertext, poolKey);
  }

  /** Get the current pool encryption config. */
  getConfig(): IPoolEncryptionConfig<string> | null {
    return this.config;
  }

  /** Check if the pool key is loaded. */
  get isReady(): boolean {
    return this.poolKey !== null;
  }
}
