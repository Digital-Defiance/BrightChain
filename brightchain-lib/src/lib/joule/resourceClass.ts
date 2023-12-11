/**
 * Resource class taxonomy for Joule metering.
 *
 * v1 classes mirror the fields of `OperationCost` in `brightchain-lib`.
 * Each class maps to one row in the active `IRateTable`.
 *
 * @see joule-resource-credits spec, Requirement 1.1
 */

/** Categorical bucket consumed at a per-class rate. */
export type ResourceClass = 'compute' | 'storage' | 'network' | 'proofOfWork';

/** Exhaustive list of v1 resource classes, suitable for iteration and
 *  validation. Order is stable across versions. */
export const RESOURCE_CLASSES: readonly ResourceClass[] = [
  'compute',
  'storage',
  'network',
  'proofOfWork',
] as const;

/**
 * Type guard that narrows an unknown string to `ResourceClass`.
 */
export function isResourceClass(value: unknown): value is ResourceClass {
  return (
    typeof value === 'string' &&
    (RESOURCE_CLASSES as readonly string[]).includes(value)
  );
}
