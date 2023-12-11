import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';

function isEmailString(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const EmailStringPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>('EmailString', 'string', isEmailString);
