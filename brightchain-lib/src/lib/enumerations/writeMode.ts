/**
 * @fileoverview Write Mode for BrightDB Write ACLs
 *
 * Controls the write access mode for a database or collection,
 * determining how the head registry authorizes write operations.
 *
 * @see BrightDB Write ACLs design, WriteMode section
 * @see Requirements 10.4, 1.1
 */

/**
 * Write access mode for a BrightDB database or collection.
 *
 * - Open: No signature required — anyone can write (backward compatible default).
 * - Restricted: Requires a Write_Proof signed by an Authorized_Writer.
 * - OwnerOnly: Requires a Write_Proof signed by the database/collection creator.
 */
export enum WriteMode {
  Open = 'open',
  Restricted = 'restricted',
  OwnerOnly = 'owner-only',
}
