import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import { createBrandedPrimitive } from '@digitaldefiance/branded-interface';

function isISO8601Timestamp(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && value === d.toISOString();
}

export const ISO8601TimestampPrimitive: BrandedPrimitiveDefinition<string> =
  createBrandedPrimitive<string>(
    'ISO8601Timestamp',
    'string',
    isISO8601Timestamp,
  );
