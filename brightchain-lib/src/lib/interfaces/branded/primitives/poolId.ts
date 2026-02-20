import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';

function isPoolId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(value);
}

export const PoolIdPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('PoolId', 'string', isPoolId);
