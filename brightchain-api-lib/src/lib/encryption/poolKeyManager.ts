/**
 * Pool Key Manager — manages the lifecycle of pool encryption keys.
 *
 * Handles key generation, distribution, rotation, and member removal
 * for pool-shared encryption mode. Old key versions are retained so
 * older blocks can still be decrypted (Requirement 15.4).
 *
 * Node IDs are derived from public keys using SHA-256 hex, consistent
 * with ECDSANodeAuthenticator.deriveNodeId.
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.4, 15.5
 */

import type {
  IKeyVersion,
  IPoolEncryptionConfig,
} from '@brightchain/brightchain-lib';
import * as crypto from 'crypto';
import { DecryptionError, KeyVersionNotFoundError } from './errors';
import { PoolEncryptionService } from './poolEncryptionService';

export class PoolKeyManager {
  private config: IPoolEncryptionConfig;
  private readonly encryptionService: PoolEncryptionService;

  constructor(
    encryptionService: PoolEncryptionService,
    initialConfig: IPoolEncryptionConfig,
  ) {
    this.encryptionService = encryptionService;
    this.config = { ...initialConfig };
  }

  /**
   * Generate a new pool key, encrypt it for each member, and create version 1.
   *
   * @param memberPublicKeys - secp256k1 public keys of all pool members
   * @returns Updated pool encryption config with the first key version
   * @see Requirement 15.2
   */
  async initializePoolKey(
    memberPublicKeys: Uint8Array[],
  ): Promise<IPoolEncryptionConfig> {
    const poolKey = this.encryptionService.generatePoolKey();
    const encryptedKeys = await this.encryptKeyForMembers(
      poolKey,
      memberPublicKeys,
    );

    const keyVersion: IKeyVersion = {
      version: 1,
      createdAt: new Date(),
      encryptedKeys,
      active: true,
    };

    this.config = {
      ...this.config,
      keyVersions: [keyVersion],
      currentKeyVersion: 1,
    };

    return this.getConfig();
  }

  /**
   * Generate a new key version, encrypt for all current members,
   * and increment currentKeyVersion. Old versions remain active
   * for decrypting older blocks (Requirement 15.4).
   *
   * @param currentMemberPublicKeys - secp256k1 public keys of current members
   * @returns Updated pool encryption config with the new key version appended
   * @see Requirements 15.3, 15.4
   */
  async rotateKey(
    currentMemberPublicKeys: Uint8Array[],
  ): Promise<IPoolEncryptionConfig> {
    const poolKey = this.encryptionService.generatePoolKey();
    const newVersion = this.config.currentKeyVersion + 1;

    const encryptedKeys = await this.encryptKeyForMembers(
      poolKey,
      currentMemberPublicKeys,
    );

    const keyVersion: IKeyVersion = {
      version: newVersion,
      createdAt: new Date(),
      encryptedKeys,
      active: true,
    };

    this.config = {
      ...this.config,
      keyVersions: [...this.config.keyVersions, keyVersion],
      currentKeyVersion: newVersion,
    };

    return this.getConfig();
  }

  /**
   * Remove a member by triggering key rotation excluding the removed member.
   * The removed member will not have access to the new key version,
   * so they cannot decrypt new blocks (Requirement 15.5).
   *
   * @param removedNodeId - Node ID of the member being removed
   * @param remainingMemberPublicKeys - Public keys of members who remain
   * @returns Updated pool encryption config after rotation
   * @see Requirement 15.5
   */
  async removeMember(
    removedNodeId: string,
    remainingMemberPublicKeys: Uint8Array[],
  ): Promise<IPoolEncryptionConfig> {
    // Filter out the removed member's keys just in case they were included
    const filteredKeys = remainingMemberPublicKeys.filter(
      (pk) => this.deriveNodeId(pk) !== removedNodeId,
    );

    return this.rotateKey(filteredKeys);
  }

  /**
   * Look up a key version in history, find the member's encrypted key,
   * and decrypt it.
   *
   * @param keyVersion - The key version number to look up
   * @param memberPrivateKey - Member's raw 32-byte secp256k1 private key
   * @param memberNodeId - The member's node ID
   * @returns The decrypted symmetric pool key for that version
   * @see Requirement 15.4
   */
  async getDecryptionKey(
    keyVersion: number,
    memberPrivateKey: Uint8Array,
    memberNodeId: string,
  ): Promise<Uint8Array> {
    const version = this.config.keyVersions.find(
      (kv) => kv.version === keyVersion,
    );
    if (!version) {
      throw new KeyVersionNotFoundError(keyVersion);
    }

    if (!version.encryptedKeys || version.encryptedKeys.length === 0) {
      throw new DecryptionError(
        `Key version ${keyVersion} has no encrypted keys`,
      );
    }

    const memberEntry = version.encryptedKeys.find(
      (ek) => ek.nodeId === memberNodeId,
    );
    if (!memberEntry) {
      throw new DecryptionError(
        `No encrypted key found for member ${memberNodeId} in key version ${keyVersion}`,
      );
    }

    return this.encryptionService.decryptKeyForMember(
      memberEntry.encryptedKey,
      memberPrivateKey,
    );
  }

  /**
   * Shortcut for getting the current version's decrypted key.
   *
   * @param memberPrivateKey - Member's raw 32-byte secp256k1 private key
   * @param memberNodeId - The member's node ID
   * @returns The decrypted symmetric pool key for the current version
   */
  async getCurrentEncryptionKey(
    memberPrivateKey: Uint8Array,
    memberNodeId: string,
  ): Promise<Uint8Array> {
    return this.getDecryptionKey(
      this.config.currentKeyVersion,
      memberPrivateKey,
      memberNodeId,
    );
  }

  /**
   * Return a copy of the current pool encryption config.
   */
  getConfig(): IPoolEncryptionConfig {
    return {
      ...this.config,
      keyVersions: this.config.keyVersions.map((kv) => ({ ...kv })),
    };
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Encrypt a pool key for each member, returning an array of
   * { nodeId, encryptedKey } entries.
   */
  private async encryptKeyForMembers(
    poolKey: Uint8Array,
    memberPublicKeys: Uint8Array[],
  ): Promise<Array<{ nodeId: string; encryptedKey: Uint8Array }>> {
    const entries = await Promise.all(
      memberPublicKeys.map(async (publicKey) => {
        const nodeId = this.deriveNodeId(publicKey);
        const encryptedKey = await this.encryptionService.encryptKeyForMember(
          poolKey,
          publicKey,
        );
        return { nodeId, encryptedKey };
      }),
    );
    return entries;
  }

  /**
   * Derive a node ID from a public key via SHA-256 hex.
   * Consistent with ECDSANodeAuthenticator.deriveNodeId.
   */
  private deriveNodeId(publicKey: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(publicKey))
      .digest('hex');
  }
}
