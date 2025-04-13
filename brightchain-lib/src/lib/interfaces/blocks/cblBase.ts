import {
  ChecksumUint8Array,
  SignatureUint8Array,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import { IEphemeralBlock } from './ephemeral';

/**
 * Shared interface for CBL/ECBL
 */
export interface ICBLCore<
  TID extends PlatformID = Uint8Array,
> extends IEphemeralBlock<TID> {
  /**
   * Creator ID of the CBL
   */
  get creatorId(): TID;

  /**
   * Date the CBL was created
   */
  get dateCreated(): Date;

  /**
   * Number of addresses in the CBL
   */
  get cblAddressCount(): number;

  /**
   * Size of the file represented by the CBL (spanning all blocks)
   */
  get originalDataLength(): number;

  /**
   * Raw data containing block references.
   * Used for:
   * 1. Direct access to references
   * 2. Signature verification
   * 3. Data reconstruction
   */
  get addressData(): Uint8Array;

  /**
   * List of block checksums.
   * Used for:
   * 1. Block identification
   * 2. Data retrieval
   * 3. Integrity verification
   */
  get addresses(): Array<ChecksumUint8Array>;

  /**
   * Cryptographic signature of the creator.
   * Used for:
   * 1. Authenticity verification
   * 2. Integrity validation
   * 3. Non-repudiation
   */
  get creatorSignature(): SignatureUint8Array;

  /**
   * Size of block tuples.
   * Used for:
   * 1. Block grouping
   * 2. XOR operations
   * 3. Data recovery
   */
  get tupleSize(): number;

  /**
   * Verify the creator's signature.
   * Validates:
   * 1. Block authenticity
   * 2. Data integrity
   * 3. Creator identity
   *
   * @returns True if the signature is valid
   */
  validateSignature(): boolean;

  /**
   * Check if the CBL is an extended CBL.
   */
  get isExtendedCbl(): boolean;
}
