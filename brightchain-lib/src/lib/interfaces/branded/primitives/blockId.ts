import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';

function isBlockId(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export const BlockIdPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('BlockId', 'string', isBlockId);
