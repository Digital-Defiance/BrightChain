/**
 * @fileoverview Capability Token serialization/deserialization helpers
 *
 * Converts ICapabilityToken instances to/from JSON strings, handling:
 * - Uint8Array fields ↔ hex string encoding
 * - Date fields ↔ ISO 8601 string encoding
 * - All other fields pass through as-is
 *
 * Follows the same pattern as aclDocumentSerialization.ts.
 *
 * @see BrightDB Write ACLs design, Capability Token Format
 * @see Requirements 6.6
 */

import { ICapabilityToken } from './capabilityToken';
import { IAclScope } from './writeAcl';

/**
 * JSON-serializable representation of ICapabilityToken.
 *
 * Uint8Array fields are hex-encoded strings.
 * Date fields are ISO 8601 strings.
 */
export interface SerializedCapabilityToken {
  granteePublicKey: string;
  scope: IAclScope;
  expiresAt: string;
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
 * - Date fields (expiresAt) are ISO 8601 strings.
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
    expiresAt: token.expiresAt.toISOString(),
    grantorSignature: uint8ArrayToHex(token.grantorSignature),
    grantorPublicKey: uint8ArrayToHex(token.grantorPublicKey),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize a JSON string into an ICapabilityToken.
 *
 * - Hex-encoded strings are converted back to Uint8Array.
 * - ISO 8601 strings are converted back to Date objects.
 * - All other fields pass through unchanged.
 *
 * @param json - JSON string to deserialize
 * @returns The deserialized capability token
 * @throws Error if the JSON is malformed or contains invalid data
 * @see Requirements 6.6
 */
export function deserializeCapabilityToken(json: string): ICapabilityToken {
  const parsed: SerializedCapabilityToken = JSON.parse(json);

  const expiresAt = new Date(parsed.expiresAt);

  if (isNaN(expiresAt.getTime())) {
    throw new Error('Invalid expiresAt date in capability token');
  }

  return {
    granteePublicKey: hexToUint8Array(parsed.granteePublicKey),
    scope: { ...parsed.scope },
    expiresAt,
    grantorSignature: hexToUint8Array(parsed.grantorSignature),
    grantorPublicKey: hexToUint8Array(parsed.grantorPublicKey),
  };
}
