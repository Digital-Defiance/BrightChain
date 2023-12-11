import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';
import type { Brand } from 'ts-brand';

function isBlockId(value: string): boolean {
  // Block IDs are lowercase hex checksums.
  // SHA-256 produces 32 bytes = 64 hex chars (used for attachment blocks).
  // SHA3-512 produces 64 bytes = 128 hex chars (used for data/CBL blocks).
  return /^[0-9a-f]{64}$/.test(value) || /^[0-9a-f]{128}$/.test(value);
}

export const BlockIdPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('BlockId', 'string', isBlockId);

/**
 * Branded type for block IDs (lowercase hex checksums).
 * Accepts 64-char (SHA-256) or 128-char (SHA3-512) hex strings.
 * Provides compile-time type safety to prevent mixing block IDs with other string types.
 */
export type BlockId = Brand<string, 'BlockId'>;

/**
 * Validate and cast a hex string to the BlockId branded type.
 * @param hex - The hex string to validate (64 or 128 lowercase hex chars)
 * @returns The validated BlockId
 * @throws Error if the string is not a valid block ID hex string
 */
export function asBlockId(hex: string): BlockId {
  if (!BlockIdPrimitive.validate(hex)) {
    throw new Error(
      `Invalid BlockId: expected 64 or 128-character lowercase hex string, got "${hex}"`,
    );
  }
  return hex as unknown as BlockId;
}
