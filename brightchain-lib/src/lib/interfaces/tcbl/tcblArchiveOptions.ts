/**
 * @fileoverview TCBL archive options interface.
 *
 * Configuration options for whole-archive compression when building a TCBL.
 * Encryption is handled externally via the existing `EncryptedBlock` wrapper
 * pattern, consistent with how CBL, ExtendedCBL, and VCBL handle encryption.
 *
 * @see Requirement 7.4, 7.5
 */

/**
 * Options controlling whole-archive compression for TCBL construction.
 *
 * Note: Encryption is not part of this interface. When encryption is desired,
 * the caller wraps the completed TCBL in an `EncryptedBlock` using the
 * existing `EncryptedBlockFactory` / `EncryptedBlockCreator` pattern.
 */
export interface ITcblArchiveOptions {
  /** Enable bzip2 compression of the entire archive payload */
  compress?: boolean;
}
