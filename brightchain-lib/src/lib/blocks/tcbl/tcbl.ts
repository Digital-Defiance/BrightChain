/**
 * @fileoverview TarballConstituentBlockListBlock — a CBL that bundles
 * multiple file/data entries into a single archive with a manifest.
 *
 * The TCBL extends {@link ConstituentBlockListBlock} and adds:
 * - Structured block header validation (magic prefix + TarballCBL type byte)
 * - A lazily-deserialized, cached manifest describing all contained entries
 * - A compression flag indicating whether the payload is bzip2-compressed
 *
 * The manifest and compression flag live in the *reconstructed payload*
 * (the data that the CBL addresses point to). The builder/reader sets
 * this payload via {@link setPayloadData} after assembling or
 * reconstructing the constituent blocks.
 *
 * Payload format (after reconstruction):
 *   Byte 0:   compression flag (0x00 = uncompressed, 0x01 = bzip2)
 *   Bytes 1+: serialized manifest (possibly bzip2-compressed)
 *
 * ## Encrypted TCBL Detection (Req 6.6)
 *
 * Encrypted TCBLs are stored as {@link EncryptedBlock} instances with
 * `BlockType.EncryptedTarballConstituentBlockListBlock`. The encrypted
 * block wraps the TCBL data using the standard ECIES encryption pattern
 * (same as CBL, ExtendedCBL, and VCBL).
 *
 * After decryption, the inner data is a plain TCBL that can be detected
 * via {@link isTarballCblData} (checks the 0xBC + 0x07 header bytes) and
 * instantiated as a `TarballConstituentBlockListBlock`. The CBL stores
 * (`MemoryCBLStore`, `DiskCBLStore`) perform this detection automatically
 * when retrieving blocks.
 *
 * @typeParam TID - Platform ID type for frontend/backend DTO compatibility
 *
 * @see Requirement 6 (Transparent Detection and Polymorphic Handling)
 * @see Requirement 2 (TCBL Manifest Structure)
 * @see Requirement 7 (Whole-Archive Compression)
 * @see Requirement 10 (Validation and Error Handling)
 */

import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import { BLOCK_HEADER, StructuredBlockType } from '../../constants';
import { BlockSize } from '../../enumerations/blockSize';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { ICBLServices } from '../../interfaces/services/cblServices';
import { ITcblEntryDescriptor } from '../../interfaces/tcbl/tcblEntryDescriptor';
import { ITcblManifest } from '../../interfaces/tcbl/tcblManifest';
import { ConstituentBlockListBlock } from '../cbl';
import { TcblManifestSerializer } from './manifestSerializer';

/**
 * A Tarball Constituent Block List block — an archive container that
 * bundles multiple file/data entries into a single CBL structure with
 * a manifest.
 *
 * Extends {@link ConstituentBlockListBlock} so that any code accepting
 * a CBL reference can also accept a TCBL reference (Req 6.3, 6.5).
 *
 * @typeParam TID - Platform ID type (defaults to `Uint8Array`)
 *
 * @see Requirement 6.3 — extends ConstituentBlockListBlock
 * @see Requirement 6.1 — header uses magic prefix + TarballCBL type byte
 * @see Requirement 10.1 — validates structured block header during construction
 */
export class TarballConstituentBlockListBlock<
  TID extends PlatformID = Uint8Array,
> extends ConstituentBlockListBlock<TID> {
  /** Cached deserialized manifest (lazy, populated on first access). */
  private _manifest?: ITcblManifest;

  /** Cached compression flag (set when payload data is provided). */
  private _isCompressed?: boolean;

  /** Reconstructed payload data set by the builder/reader. */
  private _payloadData?: Uint8Array;

  /**
   * Create a new TCBL block.
   *
   * @param data - Raw CBL data (header + addresses, optionally padded)
   * @param creator - The creator of the CBL
   * @param blockSize - Optional block size for signature validation
   * @param services - Optional injected CBL services for dependency injection
   *
   * @throws {TcblError} with {@link TcblErrorType.InvalidHeader} if the
   *   structured block header does not identify this as a TarballCBL
   *
   * @see Requirement 6.1, 10.1
   */
  constructor(
    data: Uint8Array,
    creator: Member<TID>,
    blockSize?: BlockSize,
    services?: ICBLServices<TID>,
  ) {
    super(data, creator, blockSize, services);
    this.validateTcblHeader();
  }

  /**
   * Validate that the structured block header identifies this block as
   * a TarballCBL (magic prefix 0xBC followed by type byte 0x07).
   *
   * @throws {TcblError} with {@link TcblErrorType.InvalidHeader}
   *
   * @see Requirement 6.1, 10.1, 10.3
   */
  private validateTcblHeader(): void {
    if (this._data.length < 2) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([['reason', 'data too short for structured block header']]),
      );
    }
    if (this._data[0] !== BLOCK_HEADER.MAGIC_PREFIX) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([
          ['reason', 'missing magic prefix'],
          ['expected', `0x${BLOCK_HEADER.MAGIC_PREFIX.toString(16)}`],
          ['actual', `0x${this._data[0].toString(16)}`],
        ]),
      );
    }
    if (this._data[1] !== StructuredBlockType.TarballCBL) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([
          ['reason', 'wrong structured block type'],
          ['expected', `0x${StructuredBlockType.TarballCBL.toString(16)}`],
          ['actual', `0x${this._data[1].toString(16)}`],
        ]),
      );
    }
  }

  /**
   * Set the reconstructed payload data.
   *
   * Called by the builder after assembling the archive or by the reader
   * after reconstructing the payload from the CBL's constituent blocks.
   *
   * Payload format:
   *   Byte 0:   compression flag (0x00 = uncompressed, 0x01 = compressed)
   *   Bytes 1+: serialized manifest data (possibly bzip2-compressed)
   *
   * @param payloadData - The reconstructed payload bytes
   *
   * @throws {TcblError} with {@link TcblErrorType.InvalidHeader} if
   *   the payload is empty or the compression flag is invalid
   *
   * @see Requirement 7.3
   */
  public setPayloadData(payloadData: Uint8Array): void {
    if (payloadData.length < 1) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([['reason', 'payload data is empty']]),
      );
    }

    const compressionByte = payloadData[0];
    if (compressionByte !== 0x00 && compressionByte !== 0x01) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([
          ['reason', 'invalid compression flag'],
          ['expected', '0x00 or 0x01'],
          ['actual', `0x${compressionByte.toString(16)}`],
        ]),
      );
    }

    this._isCompressed = compressionByte === 0x01;
    this._payloadData = payloadData;
    // Invalidate cached manifest so it is re-parsed from the new payload
    this._manifest = undefined;
  }

  /**
   * Whether the archive payload is bzip2-compressed.
   *
   * @throws {TcblError} with {@link TcblErrorType.InvalidHeader} if
   *   payload data has not been set via {@link setPayloadData}
   *
   * @see Requirement 7.3
   */
  public get isCompressed(): boolean {
    if (this._isCompressed === undefined) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([['reason', 'payload data not loaded; call setPayloadData()']]),
      );
    }
    return this._isCompressed;
  }

  /**
   * The TCBL manifest — lazily deserialized and cached on first access.
   *
   * The manifest is parsed from the payload data (bytes after the
   * compression flag). The checksum embedded in the manifest is
   * validated during deserialization by {@link TcblManifestSerializer}.
   *
   * @throws {TcblError} with {@link TcblErrorType.InvalidHeader} if
   *   payload data has not been set
   * @throws {TcblError} with {@link TcblErrorType.ManifestCorrupted} or
   *   {@link TcblErrorType.ManifestTruncated} if deserialization fails
   *
   * @see Requirement 2, 10.2
   */
  public get manifest(): ITcblManifest {
    if (!this._manifest) {
      if (!this._payloadData) {
        throw new TcblError(
          TcblErrorType.InvalidHeader,
          new Map([
            ['reason', 'payload data not loaded; call setPayloadData()'],
          ]),
        );
      }
      // Skip the compression flag byte, deserialize the manifest
      const manifestData = this._payloadData.subarray(1);
      this._manifest = TcblManifestSerializer.deserialize(manifestData);
    }
    return this._manifest;
  }

  /**
   * The entry descriptors from the manifest.
   *
   * @see Requirement 5.4
   */
  public get entries(): ITcblEntryDescriptor[] {
    return this.manifest.entries;
  }

  /**
   * Synchronous validation including TCBL-specific checks.
   *
   * Validates:
   * 1. Base CBL structure (via `super.validateSync()`)
   * 2. Structured block header (magic prefix + TarballCBL type byte)
   * 3. Manifest entry count consistency (if manifest has been loaded)
   *
   * @throws {TcblError} with {@link TcblErrorType.ManifestCountMismatch}
   *   if the manifest's `entryCount` does not match `entries.length`
   *
   * @see Requirement 10.4
   */
  public override validateSync(): void {
    super.validateSync();
    this.validateTcblHeader();
    this.validateManifestCount();
  }

  /**
   * Asynchronous validation including TCBL-specific checks.
   *
   * @see Requirement 10.4
   */
  public override async validateAsync(): Promise<void> {
    await super.validateAsync();
    this.validateTcblHeader();
    this.validateManifestCount();
  }

  /**
   * Validate that the manifest entry count matches the actual number
   * of entry descriptors. Only runs if the manifest has already been
   * loaded (avoids forcing deserialization during validation).
   *
   * @throws {TcblError} with {@link TcblErrorType.ManifestCountMismatch}
   *
   * @see Requirement 10.4
   */
  private validateManifestCount(): void {
    if (this._manifest) {
      if (this._manifest.entryCount !== this._manifest.entries.length) {
        throw new TcblError(
          TcblErrorType.ManifestCountMismatch,
          new Map([
            ['entryCount', String(this._manifest.entryCount)],
            ['actualEntries', String(this._manifest.entries.length)],
          ]),
        );
      }
    }
  }
}

/**
 * Type guard that narrows a {@link ConstituentBlockListBlock} to a
 * {@link TarballConstituentBlockListBlock}.
 *
 * Use this to safely upcast a CBL reference when you need to access
 * TCBL-specific APIs (manifest, entries, isCompressed).
 *
 * @param block - Any CBL instance
 * @returns `true` if `block` is a `TarballConstituentBlockListBlock`
 *
 * @example
 * ```typescript
 * const cbl = await cblStore.get(checksum, hydrateGuid);
 * if (isTcbl(cbl)) {
 *   // cbl is now typed as TarballConstituentBlockListBlock
 *   const entries = cbl.entries;
 * }
 * ```
 *
 * @see Requirement 6.4 — consumer can upcast CBL to TCBL
 */
export function isTcbl<TID extends PlatformID = Uint8Array>(
  block: ConstituentBlockListBlock<TID>,
): block is TarballConstituentBlockListBlock<TID> {
  return block instanceof TarballConstituentBlockListBlock;
}
