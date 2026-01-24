/**
 * @file ICBLServices interface for CBL dependency injection
 * @description Defines the contract for services required by CBL blocks.
 * This interface enables dependency injection to break circular dependencies
 * in CBL construction and validation.
 *
 * @requirements 2.2
 */

import {
  PlatformID,
  SignatureUint8Array,
  TypedIdProviderWrapper,
  Member,
} from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { Checksum } from '../../types/checksum';

/**
 * Interface for checksum calculation operations required by CBL.
 * This is a subset of ChecksumService methods needed for CBL operations.
 */
export interface ICBLChecksumService {
  /**
   * Calculate a checksum for a buffer.
   * @param data - The data to calculate the checksum for
   * @returns The checksum
   */
  calculateChecksum(data: Uint8Array): Checksum;
}

/**
 * Interface for CBL-specific operations required during construction.
 * This is a subset of CBLService methods needed for CBL block construction.
 */
export interface ICBLServiceCore<TID extends PlatformID = Uint8Array> {
  /**
   * Get the enhanced ID provider for this service
   */
  readonly idProvider: TypedIdProviderWrapper<TID>;

  /**
   * Check if the header is an extended CBL header
   * @param data - The CBL data
   * @returns True if extended header
   */
  isExtendedHeader(data: Uint8Array): boolean;

  /**
   * Get the date created from the header
   * @param header - The CBL header data
   * @returns The date created
   */
  getDateCreated(header: Uint8Array): Date;

  /**
   * Get the creator ID from the header
   * @param header - The CBL header data
   * @returns The creator ID
   */
  getCreatorId(header: Uint8Array): TID;

  /**
   * Get the block data length (header + addresses)
   * @param data - The CBL data
   * @returns The block data length
   */
  getBlockDataLength(data: Uint8Array): number;

  /**
   * Get the CBL address count from the header
   * @param header - The CBL header data
   * @returns The number of addresses
   */
  getCblAddressCount(header: Uint8Array): number;

  /**
   * Validate the signature of a CBL
   * @param data - The CBL data
   * @param creator - The creator of the CBL
   * @param blockSize - The block size to use for validation
   * @returns True if the signature is valid
   */
  validateSignature(
    data: Uint8Array,
    creator: Member<TID>,
    blockSize?: BlockSize,
  ): boolean;

  /**
   * Get the original data length from the header
   * @param header - The CBL header data
   * @returns The original data length
   */
  getOriginalDataLength(header: Uint8Array): number;

  /**
   * Get the tuple size from the header
   * @param header - The CBL header data
   * @returns The tuple size
   */
  getTupleSize(header: Uint8Array): number;

  /**
   * Get the creator signature from the header
   * @param header - The CBL header data
   * @returns The signature
   */
  getSignature(header: Uint8Array): SignatureUint8Array;

  /**
   * Get the address data from the CBL
   * @param data - The CBL data
   * @returns The address data
   */
  getAddressData(data: Uint8Array): Uint8Array;

  /**
   * Get the addresses from the CBL
   * @param data - The CBL data
   * @returns Array of checksums
   */
  addressDataToAddresses(data: Uint8Array): Checksum[];

  /**
   * Get the length of the header
   * @param data - The CBL data
   * @returns The header length
   */
  getHeaderLength(data: Uint8Array): number;
}

/**
 * Interface for services required by CBL blocks.
 *
 * This interface enables dependency injection for CBL construction,
 * breaking circular dependencies that occur when CBLBase directly
 * calls ServiceLocator during construction.
 *
 * @typeParam TID - The platform ID type (defaults to Uint8Array)
 *
 * @example
 * ```typescript
 * // Create services for CBL construction
 * const services: ICBLServices<Uint8Array> = {
 *   checksumService: checksumService,
 *   cblService: cblService,
 * };
 *
 * // Use in CBL construction
 * const cbl = new CBL(data, creator, services);
 * ```
 *
 * @requirements 2.2
 */
export interface ICBLServices<TID extends PlatformID = Uint8Array> {
  /**
   * Service for calculating checksums.
   * Used for:
   * 1. Calculating block checksums during construction
   * 2. Validating block integrity
   */
  readonly checksumService: ICBLChecksumService;

  /**
   * Service for CBL-specific operations.
   * Used for:
   * 1. Parsing CBL headers
   * 2. Validating CBL structure
   * 3. Extracting CBL metadata
   */
  readonly cblService: ICBLServiceCore<TID>;
}
