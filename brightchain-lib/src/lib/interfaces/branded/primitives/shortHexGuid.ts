import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';

function isShortHexGuid(value: string): boolean {
  return /^[0-9a-f]{8}$/.test(value);
}

export const ShortHexGuidPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('ShortHexGuid', 'string', isShortHexGuid);
