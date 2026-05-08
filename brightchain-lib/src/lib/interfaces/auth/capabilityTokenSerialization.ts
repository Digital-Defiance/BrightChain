/**
 * @fileoverview Capability Token serialization/deserialization helpers
 *
 * Converts ICapabilityToken instances to/from JSON strings, handling:
 * - Uint8Array fields ↔ hex string encoding
 * - BrightDateTimestamp fields stored as numbers
 * - All other fields pass through as-is
 *
 * Follows the same pattern as aclDocumentSerialization.ts.
 *
 * @see BrightDB Write ACLs design, Capability Token Format
 * @see Requirements 6.6
 */

import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { normalizeToBrightDate } from '../../utils/brightDateConversions';
import { ICapabilityToken } from './capabilityToken';
import { IAclScope } from './writeAcl';

/**
 * JSON-serializable representation of ICapabilityToken.
 *
 * Uint8Array fields are hex-encoded strings.
 * BrightDateTimestamp fields are stored as numbers.
 */
export interface SerializedCapabilityToken {
  granteePublicKey: string;
  scope: IAclScope;
  expiresAt: number;
  grantorSignature: string;
  grantorPublicKey: string;
}

/**
 * Convert a Uint8Array to a hex-encoded string.
 */
function uint8ArrayToHex(arr: Uint8Array): string {
  return Buffer.from(arr).toString('hex');
}

/**
 * Convert a hex-encoded string to a Uint8Array.
 */
function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

/**
 * Serialize an ICapabilityToken to a JSON string.
 *
 * - Uint8Array fields (granteePublicKey, grantorSignature,
 *   grantorPublicKey) are hex-encoded.
 * - BrightDateTimestamp fields (expiresAt) are stored as numbers.
 * - All other fields pass through unchanged.
 *
 * @param token - The capability token to serialize
 * @returns JSON string representation
 * @see Requirements 6.6
 */
export function serializeCapabilityToken(token: ICapabilityToken): string {
  const serialized: SerializedCapabilityToken = {
    granteePublicKey: uint8ArrayToHex(token.granteePublicKey),
    scope: { ...token.scope },
    expiresAt: token.expiresAt,
    grantorSignature: uint8ArrayToHex(token.grantorSignature),
    grantorPublicKey: uint8ArrayToHex(token.grantorPublicKey),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize a JSON string into an ICapabilityToken.
 *
 * - Hex-encoded strings are converted back to Uint8Array.
 * - Timestamp fields are normalized to BrightDateTimestamp via normalizeToBrightDate
 *   (handles both legacy ISO strings and native numeric BrightDateValues).
 * - All other fields pass through unchanged.
 *
 * @param json - JSON string to deserialize
 * @returns The deserialized capability token
 * @throws Error if the JSON is malformed or contains invalid data
 * @see Requirements 6.6
 */
export function deserializeCapabilityToken(json: string): ICapabilityToken {
  const parsed: SerializedCapabilityToken = JSON.parse(json);

  const expiresAt: BrightDateTimestamp = normalizeToBrightDate(
    parsed.expiresAt as unknown as string | number,
  );

  return {
    granteePublicKey: hexToUint8Array(parsed.granteePublicKey),
    scope: { ...parsed.scope },
    expiresAt,
    grantorSignature: hexToUint8Array(parsed.grantorSignature),
    grantorPublicKey: hexToUint8Array(parsed.grantorPublicKey),
  };
}
