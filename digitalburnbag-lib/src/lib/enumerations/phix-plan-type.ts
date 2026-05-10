/**
 * @enum PhixPlanType
 * @description Describes the weight of a Phix (Phoenix-cycle rename) operation.
 *
 * - `metadataOnly` — Instant. Only the name field changes in BrightDB.
 *   No data is moved, no vaults are touched, no re-encryption occurs.
 *
 * - `fullCycle` — Heavy. The original is cloned under the new identity,
 *   verified, and then the original is destroyed (copy-then-destroy).
 *   Used when a rename requires re-encryption, ownership transfer,
 *   or structural data migration.
 */
export enum PhixPlanType {
  /** Metadata-only rename — instant, no data movement */
  MetadataOnly = 'metadata_only',
  /** Full phoenix cycle — clone, verify, destroy original */
  FullCycle = 'full_cycle',
}
