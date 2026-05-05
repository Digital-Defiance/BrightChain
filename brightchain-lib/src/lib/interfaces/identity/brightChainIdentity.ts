import type { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Browser-safe descriptor of a BrightChain identity. Contains only public,
 * non-sensitive fields that are safe to transport over the network and to
 * serialize as JSON.
 *
 * The server-side counterpart that pairs this descriptor with a live
 * `Member` (private-key material) lives in `@brightchain/brightchain-identity`
 * as `IBrightChainIdentityBundle` and MUST NOT cross the network boundary.
 *
 * @typeParam TID - Platform-typed identifier (Buffer in Node.js, ObjectId in
 *                  Mongo contexts, string when serialized for the wire).
 */
export interface IBrightChainIdentity<TID extends PlatformID = string> {
  /** Stable platform-typed identifier. */
  id: TID;
  /** Human-readable display name. */
  displayName: string;
  /** Verified email address associated with the identity. */
  email: string;
  /**
   * secp256k1 public key, hex-encoded so the descriptor is JSON-safe. The
   * concrete encoding (compressed 33-byte / uncompressed 65-byte) is decided
   * by the underlying `Member` implementation; consumers should treat the
   * value as opaque.
   */
  publicKeyHex: string;
}
