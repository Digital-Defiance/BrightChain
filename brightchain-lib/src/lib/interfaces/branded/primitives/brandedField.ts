import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import type { FieldSchema } from '../../storage/documentTypes';

/**
 * Produces a `FieldSchema` with `type: 'branded-primitive'` and `ref` set to
 * the definition's ID. Optional extra constraints (e.g. `required`, `minLength`)
 * can be passed as the second argument; `type` and `ref` always take precedence.
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
 */
export function brandedField<T extends string | number | boolean>(
  definition: BrandedPrimitiveDefinition<T>,
  options?: Partial<FieldSchema>,
): FieldSchema {
  return {
    ...options,
    type: 'branded-primitive',
    ref: definition.id,
  };
}
