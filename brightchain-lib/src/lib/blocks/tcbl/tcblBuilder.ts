/**
 * @fileoverview TCBL Archive Builder.
 *
 * Constructs a TCBL (Tarball CBL) archive from a set of input entries.
 * Each entry's data is stored as a raw block in the block store, and a
 * manifest is built from the entry metadata. The final TCBL is assembled
 * as a CBL with a `StructuredBlockType.TarballCBL` header.
 *
 * Optional bzip2 compression can be applied to the entire payload.
 *
 * @typeParam TID - Platform ID type for frontend/backend DTO compatibility
 *
 * @see Requirement 4 (TCBL Construction)
 * @see Requirement 7 (Whole-Archive Compression)
 */

import { CHECKSUM, Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { StructuredBlockType, TUPLE } from '../../constants';
import { BlockEncryptionType } from '../../enumerations/blockEncryptionType';
import { BlockSize } from '../../enumerations/blockSize';
import { ICBLServices } from '../../interfaces/services/cblServices';
import { IBlockStore } from '../../interfaces/storage/blockStore';
import { ITcblArchiveOptions } from '../../interfaces/tcbl/tcblArchiveOptions';
import { ITcblEntryDescriptor } from '../../interfaces/tcbl/tcblEntryDescriptor';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';
import { ITcblManifest } from '../../interfaces/tcbl/tcblManifest';
import { getGlobalServiceProvider } from '../../services/globalServiceProvider';
import { Checksum } from '../../types/checksum';
import { RawDataBlock } from '../rawData';
import { TcblManifestSerializer } from './manifestSerializer';
import { TarballConstituentBlockListBlock } from './tcbl';
import { TcblValidator } from './tcblValidator';

/**
 * Builder for constructing TCBL (Tarball CBL) archives.
 *
 * Usage:
 * ```typescript
 * const builder = new TcblBuilder(creator, blockSize, blockStore);
 * await builder.addEntry({ fileName: 'file.txt', mimeType: 'text/plain', data });
 * const tcbl = await builder.build();
 * ```
 *
 * @typeParam TID - Platform ID type (defaults to `Uint8Array`)
 *
 * @see Requirement 4
 */
export class TcblBuilder<TID extends PlatformID = Uint8Array> {
  /** The creator of the archive. */
  private readonly creator: Member<TID>;

  /** Block size for entry data blocks. */
  private readonly blockSize: BlockSize;

  /** Block store for persisting entry data and the final TCBL. */
  private readonly blockStore: IBlockStore;

  /** Optional CBL services for dependency injection. */
  private readonly services?: ICBLServices<TID>;

  /** Whether to bzip2-compress the archive payload. */
  private readonly compress: boolean;

  /** Collected entry descriptors (populated by addEntry). */
  private readonly entryDescriptors: ITcblEntryDescriptor[] = [];

  /**
   * Create a new TCBL builder.
   *
   * @param creator - The member creating the archive
   * @param blockSize - Block size for storing entry data
   * @param blockStore - Block store for persisting blocks
   * @param services - Optional CBL services for dependency injection
   * @param options - Optional archive options (compression)
   *
   * @see Requirement 4.8, 4.9
   */
  constructor(
    creator: Member<TID>,
    blockSize: BlockSize,
    blockStore: IBlockStore,
    services?: ICBLServices<TID>,
    options?: ITcblArchiveOptions,
  ) {
    this.creator = creator;
    this.blockSize = blockSize;
    this.blockStore = blockStore;
    this.services = services;
    this.compress = options?.compress ?? false;
  }

  /**
   * Add an entry to the archive.
   *
   * Validates the input, stores the entry data as a raw block in the
   * block store, and records the entry descriptor for the manifest.
   *
   * @param input - The entry input (fileName, mimeType, data)
   *
   * @throws {TcblError} if validation fails (file name too long,
   *   path traversal, MIME type too long)
   *
   * @see Requirement 4.1, 4.2
   */
  async addEntry(input: ITcblEntryInput): Promise<void> {
    // Validate the entry input
    TcblValidator.validateFileName(input.fileName);
    TcblValidator.validateMimeType(input.mimeType);

    // Store entry data as a raw block
    const checksumService =
      this.services?.checksumService ??
      getGlobalServiceProvider<TID>().checksumService;
    const checksum = checksumService.calculateChecksum(input.data);
    const rawBlock = new RawDataBlock(
      this.blockSize,
      input.data,
      undefined,
      checksum,
    );
    await this.blockStore.setData(rawBlock);

    // Record the entry descriptor
    this.entryDescriptors.push({
      fileName: input.fileName,
      mimeType: input.mimeType,
      originalDataLength: input.data.length,
      cblAddress: checksum,
    });
  }

  /**
   * Build the TCBL archive.
   *
   * Constructs the manifest from collected entries, serializes it,
   * optionally compresses the payload, creates a CBL header with
   * `StructuredBlockType.TarballCBL`, and returns the final TCBL block.
   *
   * @returns The constructed TCBL block
   *
   * @see Requirement 4.3, 4.4, 4.5, 4.7, 4.10, 7.1, 7.3
   */
  async build(): Promise<TarballConstituentBlockListBlock<TID>> {
    const checksumService =
      this.services?.checksumService ??
      getGlobalServiceProvider<TID>().checksumService;
    const cblService =
      this.services?.cblService ?? getGlobalServiceProvider<TID>().cblService;

    // Build the manifest
    const manifest: ITcblManifest = {
      version: 1,
      entryCount: this.entryDescriptors.length,
      entries: [...this.entryDescriptors],
      checksum: Checksum.fromUint8Array(
        new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH),
      ),
    };

    // Serialize the manifest
    const serializedManifest = TcblManifestSerializer.serialize(manifest);

    // Assemble the TCBL payload: [compressionFlag(1)][manifestData]
    let manifestData: Uint8Array;
    if (this.compress) {
      // Dynamic import to avoid ESM/CJS issues at module load time
      const BZip2Module = await import('bzip2-wasm');
      const BZip2 = BZip2Module.default;
      const bzip2 = new BZip2();
      await bzip2.init();
      const compressed = bzip2.compress(serializedManifest);
      // Store uncompressed length as uint32 BE so decompressor knows buffer size
      const withLength = new Uint8Array(4 + compressed.length);
      const view = new DataView(
        withLength.buffer,
        withLength.byteOffset,
        withLength.byteLength,
      );
      view.setUint32(0, serializedManifest.length, false);
      withLength.set(compressed, 4);
      manifestData = withLength;
    } else {
      manifestData = serializedManifest;
    }

    // Full payload: [compressionFlag(1 byte)][manifestData]
    const payload = new Uint8Array(1 + manifestData.length);
    payload[0] = this.compress ? 0x01 : 0x00;
    payload.set(manifestData, 1);

    // Store the payload as a raw block so we have an address for it
    const payloadChecksum = checksumService.calculateChecksum(payload);
    const payloadBlock = new RawDataBlock(
      this.blockSize,
      payload,
      undefined,
      payloadChecksum,
    );
    await this.blockStore.setData(payloadBlock);

    // Build the address list: entry data checksums + payload checksum
    const allAddresses: Checksum[] = [
      ...this.entryDescriptors.map((e) => e.cblAddress),
      payloadChecksum,
    ];
    const addressBytes = CHECKSUM.SHA3_BUFFER_LENGTH;
    const addressList = new Uint8Array(allAddresses.length * addressBytes);
    for (let i = 0; i < allAddresses.length; i++) {
      addressList.set(allAddresses[i].toUint8Array(), i * addressBytes);
    }

    // Create CBL header via cblService.makeCblHeader
    // Use Small block size to ensure enough capacity for addresses
    const cblBlockSize = BlockSize.Small;
    const { headerData } = cblService.makeCblHeader(
      this.creator,
      new Date(),
      allAddresses.length,
      payload.length,
      addressList,
      cblBlockSize,
      BlockEncryptionType.None,
      undefined,
      TUPLE.SIZE,
    );

    // Patch the structured block type byte from CBL to TarballCBL.
    // The CRC8 is computed over baseHeader + extendedHeaderData (not the
    // structured prefix), and the signature is computed over
    // baseHeader + extendedHeaderData + blockSize + addressList.
    // Neither includes byte[1], so patching is safe.
    const patchedHeader = new Uint8Array(headerData);
    patchedHeader[1] = StructuredBlockType.TarballCBL;

    // Assemble the full block data: header + addresses, padded to block size
    const blockSizeBytes = cblBlockSize as number;
    const data = new Uint8Array(blockSizeBytes);
    data.set(patchedHeader, 0);
    data.set(addressList, patchedHeader.length);

    // Create the TarballConstituentBlockListBlock
    const tcblBlock = new TarballConstituentBlockListBlock<TID>(
      data,
      this.creator,
      cblBlockSize,
      this.services,
    );

    // Set the payload data so the manifest can be accessed
    tcblBlock.setPayloadData(payload);

    return tcblBlock;
  }
}
