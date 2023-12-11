/**
 * @fileoverview TCBL Archive Reader.
 *
 * Reads and extracts entries from a TCBL (Tarball CBL) archive.
 * The reader receives an already-constructed {@link TarballConstituentBlockListBlock}
 * and a block store. Decryption of any `EncryptedBlock` wrapper is the
 * caller's responsibility.
 *
 * Usage:
 * ```typescript
 * const reader = new TcblReader(tcblBlock, blockStore);
 * await reader.open();
 * const entries = reader.listEntries();
 * const data = await reader.getEntryByName('file.txt');
 * ```
 *
 * @typeParam TID - Platform ID type for frontend/backend DTO compatibility
 *
 * @see Requirement 5 (TCBL Reading and Extraction)
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ITcblEntryDescriptor } from '../../interfaces/tcbl/tcblEntryDescriptor';
import { TarballConstituentBlockListBlock } from './tcbl';

/**
 * Reader for TCBL (Tarball CBL) archives.
 *
 * Provides methods to enumerate manifest entries and extract individual
 * entry data from the block store. The {@link open} method must be called
 * before any other operations.
 *
 * @typeParam TID - Platform ID type (defaults to `Uint8Array`)
 *
 * @see Requirement 5
 */
export class TcblReader<TID extends PlatformID = Uint8Array> {
  /** The TCBL block being read. */
  private readonly tcblBlock: TarballConstituentBlockListBlock<TID>;

  /** Block store for retrieving entry data. */
  private readonly blockStore: IBlockStore;

  /** Whether {@link open} has been called successfully. */
  private _isOpen = false;

  /** Cached manifest entries after open(). */
  private _entries: ITcblEntryDescriptor[] = [];

  /**
   * Create a new TCBL reader.
   *
   * @param tcblBlock - The TCBL block to read (must be already decrypted)
   * @param blockStore - Block store for retrieving entry data blocks
   *
   * @see Requirement 5.7 — decryption is the caller's responsibility
   */
  constructor(
    tcblBlock: TarballConstituentBlockListBlock<TID>,
    blockStore: IBlockStore,
  ) {
    this.tcblBlock = tcblBlock;
    this.blockStore = blockStore;
  }

  /**
   * Open the archive for reading.
   *
   * Retrieves the payload block from the block store (last address in
   * the CBL's address list), handles decompression if the payload is
   * bzip2-compressed, sets the payload data on the TCBL block, and
   * validates the manifest checksum.
   *
   * Must be called before {@link listEntries}, {@link getEntryByIndex},
   * or {@link getEntryByName}.
   *
   * @throws {TcblError} with {@link TcblErrorType.DecompressionFailed}
   *   if bzip2 decompression fails
   * @throws {TcblError} with {@link TcblErrorType.ManifestChecksumMismatch}
   *   if the manifest checksum does not match
   * @throws {TcblError} with {@link TcblErrorType.ManifestCorrupted}
   *   if the manifest is structurally invalid
   *
   * @see Requirement 5.1, 5.2, 5.5
   */
  async open(): Promise<void> {
    // Retrieve the payload block — it's the last address in the CBL
    const addresses = this.tcblBlock.addresses;
    const payloadAddress = addresses[addresses.length - 1];
    const payloadBlock = await this.blockStore.getData(payloadAddress);
    const rawPayload = payloadBlock.data;

    // Check the compression flag (byte 0)
    const compressionFlag = rawPayload[0];

    let decompressedPayload: Uint8Array;
    if (compressionFlag === 0x01) {
      // Compressed: [0x01][uncompressedLength(4 bytes BE)][bzip2 data]
      try {
        const view = new DataView(
          rawPayload.buffer,
          rawPayload.byteOffset,
          rawPayload.byteLength,
        );
        const uncompressedLength = view.getUint32(1, false);
        const compressedData = rawPayload.subarray(5);

        const BZip2Module = await import('@digitaldefiance/bzip2-wasm');
        const BZip2 = BZip2Module.default;
        const bzip2 = new BZip2();
        await bzip2.init();
        const decompressedManifest = bzip2.decompress(
          compressedData,
          uncompressedLength,
        );

        // Build a new uncompressed payload: [0x00][decompressedManifest]
        decompressedPayload = new Uint8Array(1 + decompressedManifest.length);
        decompressedPayload[0] = 0x00;
        decompressedPayload.set(decompressedManifest, 1);
      } catch (e) {
        if (e instanceof TcblError) throw e;
        throw new TcblError(
          TcblErrorType.DecompressionFailed,
          new Map([['reason', String(e)]]),
        );
      }
    } else {
      // Uncompressed: use as-is
      decompressedPayload = rawPayload;
    }

    // Set the (decompressed) payload on the TCBL block.
    // This will parse the manifest via the block's manifest getter.
    // The deserializer validates the manifest checksum internally,
    // throwing ManifestCorrupted if it doesn't match.
    try {
      this.tcblBlock.setPayloadData(decompressedPayload);
    } catch (e) {
      if (e instanceof TcblError) {
        // Re-map ManifestCorrupted to ManifestChecksumMismatch if it's
        // a checksum issue (the deserializer throws ManifestCorrupted
        // for checksum failures)
        if (e.errorType === TcblErrorType.ManifestCorrupted) {
          throw new TcblError(TcblErrorType.ManifestChecksumMismatch);
        }
        throw e;
      }
      throw e;
    }

    // Access the manifest to trigger deserialization and checksum validation.
    // The manifest getter calls TcblManifestSerializer.deserialize() which
    // validates the checksum internally.
    try {
      this._entries = [...this.tcblBlock.manifest.entries];
    } catch (e) {
      if (e instanceof TcblError) {
        if (e.errorType === TcblErrorType.ManifestCorrupted) {
          throw new TcblError(TcblErrorType.ManifestChecksumMismatch);
        }
        throw e;
      }
      throw e;
    }

    this._isOpen = true;
  }

  /**
   * Ensure the archive has been opened.
   *
   * @throws {TcblError} with {@link TcblErrorType.InvalidHeader} if
   *   {@link open} has not been called
   */
  private ensureOpen(): void {
    if (!this._isOpen) {
      throw new TcblError(
        TcblErrorType.InvalidHeader,
        new Map([['reason', 'archive not opened; call open() first']]),
      );
    }
  }

  /**
   * List all entry descriptors from the manifest without extracting data.
   *
   * @returns Array of entry descriptors
   * @throws {TcblError} if the archive has not been opened
   *
   * @see Requirement 5.3
   */
  listEntries(): ITcblEntryDescriptor[] {
    this.ensureOpen();
    return [...this._entries];
  }

  /**
   * Retrieve entry data by index.
   *
   * @param index - Zero-based index into the manifest entries
   * @returns The entry's original data (trimmed to originalDataLength)
   *
   * @throws {TcblError} with {@link TcblErrorType.EntryNotFound} if
   *   the index is out of range
   *
   * @see Requirement 5.4, 5.6
   */
  async getEntryByIndex(index: number): Promise<Uint8Array> {
    this.ensureOpen();

    if (index < 0 || index >= this._entries.length) {
      throw new TcblError(
        TcblErrorType.EntryNotFound,
        new Map([
          ['index', String(index)],
          ['entryCount', String(this._entries.length)],
        ]),
      );
    }

    const entry = this._entries[index];
    return this.retrieveEntryData(entry);
  }

  /**
   * Retrieve entry data by file name.
   *
   * @param fileName - The file name to search for in the manifest
   * @returns The entry's original data (trimmed to originalDataLength)
   *
   * @throws {TcblError} with {@link TcblErrorType.EntryNotFound} if
   *   no entry with the given file name exists
   *
   * @see Requirement 5.4, 5.6
   */
  async getEntryByName(fileName: string): Promise<Uint8Array> {
    this.ensureOpen();

    const entry = this._entries.find((e) => e.fileName === fileName);
    if (!entry) {
      throw new TcblError(
        TcblErrorType.EntryNotFound,
        new Map([['fileName', fileName]]),
      );
    }

    return this.retrieveEntryData(entry);
  }

  /**
   * Retrieve the raw data for a manifest entry from the block store.
   *
   * The block store returns a {@link RawDataBlock} padded to block size,
   * so we trim to `originalDataLength` to get the actual data.
   *
   * @param entry - The entry descriptor from the manifest
   * @returns The entry's original data bytes
   */
  private async retrieveEntryData(
    entry: ITcblEntryDescriptor,
  ): Promise<Uint8Array> {
    const rawBlock = await this.blockStore.getData(entry.cblAddress);
    return rawBlock.data.subarray(0, entry.originalDataLength);
  }
}
