import {
  BSLP_PROTOCOL,
  BSLP_VERSION,
  type IBrightNexusLocationPublishRequest,
  type IBrightSpacetimePrivacy,
  type IBrightSpacetimeVector,
} from '../interfaces/bright-spacetime';
import { normalizeBrightSpacetimeVector } from './validation';

/**
 * Payload covered by the publisher's ECDSA signature (BSLP §2).
 * Excludes `signature`; binds `ipAddress` to the spacetime claim.
 */
export interface IBslpSignablePayload {
  protocol: typeof BSLP_PROTOCOL;
  version: typeof BSLP_VERSION;
  ipAddress: string;
  nodeId: string;
  vector: IBrightSpacetimeVector;
  privacy: IBrightSpacetimePrivacy;
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep(
        (value as Record<string, unknown>)[key],
      );
    }
    return sorted;
  }
  return value;
}

/**
 * Build the signable BSLP payload for a publish request.
 */
export function buildBslpSignablePayload(
  memberIdHex: string,
  body: Pick<
    IBrightNexusLocationPublishRequest,
    'ipAddress' | 'vector' | 'privacy'
  >,
): IBslpSignablePayload {
  return {
    protocol: BSLP_PROTOCOL,
    version: BSLP_VERSION,
    ipAddress: body.ipAddress.trim(),
    nodeId: memberIdHex,
    vector: normalizeBrightSpacetimeVector(body.vector),
    privacy: body.privacy,
  };
}

/**
 * Canonical JSON (sorted keys, no whitespace) used for ECDSA signing.
 */
export function canonicalBslpSignPayloadJson(
  payload: IBslpSignablePayload,
): string {
  return JSON.stringify(sortKeysDeep(payload));
}

/**
 * UTF-8 bytes of the canonical signing payload.
 */
export function canonicalBslpSignPayloadBytes(
  payload: IBslpSignablePayload,
): Uint8Array {
  return new TextEncoder().encode(canonicalBslpSignPayloadJson(payload));
}

/**
 * Normalize a signature hex string (strip optional `0x` prefix).
 */
export function normalizeBslpSignatureHex(signature: string): string {
  const trimmed = signature.trim();
  return trimmed.startsWith('0x') || trimmed.startsWith('0X')
    ? trimmed.slice(2)
    : trimmed;
}

/** Hex-encode bytes without Node.js Buffer (browser-safe). */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Canonical JSON and hex-encoded UTF-8 bytes for ECDSA signing.
 */
export function canonicalBslpSignPayloadHex(payload: IBslpSignablePayload): {
  payloadHex: string;
  canonicalJson: string;
} {
  const canonicalJson = canonicalBslpSignPayloadJson(payload);
  const payloadHex = bytesToHex(canonicalBslpSignPayloadBytes(payload));
  return { payloadHex, canonicalJson };
}
