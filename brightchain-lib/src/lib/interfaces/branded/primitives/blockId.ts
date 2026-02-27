import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';
import type { Brand } from 'ts-brand';

function isBlockId(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export const BlockIdPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('BlockId', 'string', isBlockId);

/**
 * Branded type for block IDs (64-character lowercase hex SHA3-512 checksums).
 * Provides compile-time type safety to prevent mixing block IDs with other string types.
 */
export type BlockId = Brand<string, 'BlockId'>;

/**
 * Validate and cast a hex string to the BlockId branded type.
 * @param hex - The hex string to validate
 * @returns The validated BlockId
 * @throws Error if the string is not a valid 64-char lowercase hex block ID
 */
export function asBlockId(hex: string): BlockId {
  if (!BlockIdPrimitive.validate(hex)) {
    throw new Error(
      `Invalid BlockId: expected 64-character lowercase hex string, got "${hex}"`,
    );
  }
  return hex as unknown as BlockId;
}
