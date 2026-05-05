/**
 * RecipientKeyLookup — narrow interface and MemberStore-backed implementation
 * for resolving a recipient's secp256k1 ECIES public key from their email address.
 *
 * Used by InboundProcessor to encrypt stored email content per-recipient
 * before writing to the Block Store.
 *
 * @see Requirement 16.1 — at-rest encryption with recipient public keys
 * @module recipientKeyLookup
 */

import type {
  IMemberQueryCriteria,
  IMemberStore,
} from '@brightchain/brightchain-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

// ─── Interface ───────────────────────────────────────────────────────────────

/**
 * Narrow interface for resolving a recipient's ECIES public key by email.
 */
export interface IRecipientKeyLookup {
  /**
   * Return the ECIES public key bytes for the member registered under the
   * given email address, or `null` if the member is unknown or has no key.
   *
   * @param address - RFC 5321 email address (e.g. "alice@example.com")
   */
  getPublicKeyForEmail(address: string): Promise<Uint8Array | null>;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * MemberStore-backed implementation of IRecipientKeyLookup.
 *
 * Queries the member store by email address to obtain the member's ID, then
 * retrieves the hex-encoded secp256k1 public key and converts it to bytes.
 */
export class MemberRecipientKeyLookup<TID extends PlatformID>
  implements IRecipientKeyLookup
{
  constructor(private readonly memberStore: IMemberStore<TID>) {}

  async getPublicKeyForEmail(address: string): Promise<Uint8Array | null> {
    const criteria: IMemberQueryCriteria<TID> = {
      email: address.toLowerCase(),
    };

    const refs = await this.memberStore.queryIndex(criteria);
    if (!refs.length) {
      return null;
    }

    const hex = await this.memberStore.getMemberPublicKeyHex(refs[0].id);
    if (!hex) {
      return null;
    }

    return Uint8Array.from(Buffer.from(hex, 'hex'));
  }
}
