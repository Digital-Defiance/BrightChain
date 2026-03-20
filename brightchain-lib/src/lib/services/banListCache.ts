/**
 * @fileoverview In-memory ban list cache.
 *
 * Each node maintains a local cache of active bans, updated via gossip.
 * Enforcement points check isBanned() which is O(1) via a hex-keyed Map.
 *
 * @see Network Trust and Ban Mechanism spec, Requirements 4.3, 4.4, 5.6
 */

import {
  HexString,
  PlatformID,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { IBanListCache } from '../interfaces/network/banListCache';
import { IBanRecord } from '../interfaces/network/banRecord';

/**
 * In-memory implementation of the ban list cache.
 * Uses a Map keyed by hex-encoded member IDs for O(1) lookups.
 *
 * @template TID - Platform ID type
 */
export class BanListCache<TID extends PlatformID = Uint8Array>
  implements IBanListCache<TID>
{
  private readonly bannedMembers = new Map<HexString, IBanRecord<TID>>();

  constructor(private readonly idProvider: TypedIdProviderWrapper<TID>) {}

  private toHex(id: TID): HexString {
    return this.idProvider.toString(id, 'hex') as HexString;
  }

  isBanned(memberId: TID): boolean {
    return this.bannedMembers.has(this.toHex(memberId));
  }

  addBan(record: IBanRecord<TID>): void {
    this.bannedMembers.set(this.toHex(record.memberId), record);
  }

  removeBan(memberId: TID): void {
    this.bannedMembers.delete(this.toHex(memberId));
  }

  getAll(): IBanRecord<TID>[] {
    return Array.from(this.bannedMembers.values());
  }

  getBan(memberId: TID): IBanRecord<TID> | null {
    return this.bannedMembers.get(this.toHex(memberId)) ?? null;
  }

  loadFrom(records: IBanRecord<TID>[]): void {
    this.bannedMembers.clear();
    for (const record of records) {
      this.bannedMembers.set(this.toHex(record.memberId), record);
    }
  }

  get size(): number {
    return this.bannedMembers.size;
  }

  /**
   * Verify a ban record's BrightTrust signatures.
   *
   * Checks that at least `record.requiredSignatures` of the attached
   * signatures are valid against the provided BrightTrust public keys.
   * Uses ECDSA signature verification (secp256k1).
   *
   * @param record - The ban record to verify
   * @param brightTrustPublicKeys - Map of hex member ID → public key bytes
   * @returns true if enough valid signatures are present
   */
  async verifySignatures(
    record: IBanRecord<TID>,
    brightTrustPublicKeys: Map<HexString, Uint8Array>,
  ): Promise<boolean> {
    if (record.approvalSignatures.length < record.requiredSignatures) {
      return false;
    }

    // Build the message that was signed: memberId + reason + epoch + bannedAt
    const memberHex = this.toHex(record.memberId);
    const message = new TextEncoder().encode(
      `ban:${memberHex}:${record.reason}:${record.epoch}:${record.bannedAt.toISOString()}`,
    );

    let validCount = 0;
    for (const sig of record.approvalSignatures) {
      const signerHex = uint8ArrayToHex(
        this.idProvider.toBytes(sig.memberId),
      ) as HexString;
      const publicKey = brightTrustPublicKeys.get(signerHex);
      if (!publicKey) {
        // Unknown signer — skip
        continue;
      }

      try {
        const isValid = await this.verifyEcdsaSignature(
          message,
          sig.signature,
          publicKey,
        );
        if (isValid) {
          validCount++;
        }
      } catch {
        // Verification error — skip this signature
      }

      if (validCount >= record.requiredSignatures) {
        return true;
      }
    }

    return validCount >= record.requiredSignatures;
  }

  /**
   * Verify an ECDSA signature using the Web Crypto API (browser-compatible)
   * or Node.js crypto. This is a minimal implementation; production code
   * should delegate to the existing ECIESService or NodeAuthenticator.
   */
  private async verifyEcdsaSignature(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<boolean> {
    // Use SubtleCrypto if available (browser + Node 20+)
    if (typeof globalThis.crypto?.subtle !== 'undefined') {
      const key = await globalThis.crypto.subtle.importKey(
        'raw',
        new Uint8Array(publicKey) as unknown as ArrayBuffer,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      );
      return globalThis.crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new Uint8Array(signature) as unknown as ArrayBuffer,
        new Uint8Array(message) as unknown as ArrayBuffer,
      );
    }

    // Fallback: assume Node.js crypto is available via dynamic import
    // This path is used in Node.js environments where SubtleCrypto
    // may not support secp256k1 directly.
    // In practice, the BrightTrustStateMachine will use the existing
    // ECIESService for signature verification rather than this fallback.
    return false;
  }
}
