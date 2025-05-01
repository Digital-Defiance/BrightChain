import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata'; // Import CblBlockMetadata
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import BlockDataType from '../enumerations/blockDataType';
import { BlockMetadataErrorType } from '../enumerations/blockMetadataErrorType';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import { CblErrorType } from '../enumerations/cblErrorType';
import { BlockAccessError, BlockMetadataError } from '../errors/block';
import { CblError } from '../errors/cblError';
import { ExtendedCblBlockMetadata } from '../extendedCblBlockMetadata'; // Import ExtendedCblBlockMetadata
import { GuidV4 } from '../guid';
import { ICBLCore } from '../interfaces/blocks/cblBase';
import { CBLService } from '../services/cblService'; // Import CBLService
import { ChecksumService } from '../services/checksum.service'; // Import ChecksumService
// Removed: import { ServiceLocator } from '../services/serviceLocator';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';
import { createBlockHandleFromPath } from './handle';
import { BlockHandleTuple } from './handleTuple';

/**
 * Shared core functionality between CBL/ECBL
 */
export abstract class CBLBase extends EphemeralBlock implements ICBLCore {
  /** Cache for validated headers */
  private static validatedHeaderCache = new WeakMap<Buffer, boolean>();

  /** Cache for address count to avoid circular dependency */
  private _cachedAddressCount: number | null = null;
  protected readonly cblService: CBLService; // Injected service
  protected readonly checksumService: ChecksumService; // Injected service

  /**
   * Create a new CBL core
   * @param data The data of the CBL
   * @param creator The member creating the block
   * @param cblService Injected CBLService instance
   * @param checksumService Injected ChecksumService instance
   */
  constructor(
    data: Buffer,
    creator: BrightChainMember,
    cblService: CBLService,
    checksumService: ChecksumService,
  ) {
    // Calculate values needed for super() *before* calling it, using parameters directly
    const isExtendedCbl = cblService.isExtendedHeader(data);
    const checksum = checksumService.calculateChecksum(data);
    const blockSize = lengthToBlockSize(data.length);
    const blockType = isExtendedCbl
      ? BlockType.ExtendedConstituentBlockListBlock
      : BlockType.ConstituentBlockList;
    const dateCreated = cblService.getDateCreated(data);
    const creatorId = cblService.getCreatorId(data);
    const blockDataLength = cblService.getBlockDataLength(data);
    const fileDataLength = cblService.getOriginalDataLength(data);
    if (
      (creator instanceof BrightChainMember && !creatorId.equals(creator.id)) ||
      (creator instanceof GuidV4 && !creatorId.equals(creator))
    ) {
      throw new BlockMetadataError(BlockMetadataErrorType.CreatorIdMismatch);
    }

    // Create the correct metadata instance based on block type
    const metadata = isExtendedCbl
      ? new ExtendedCblBlockMetadata(
          blockSize,
          blockDataLength, // lengthWithoutPadding
          fileDataLength, // fileDataLength
          cblService.getFileName(data), // fileName
          cblService.getMimeType(data), // mimeType
          creator ?? creatorId,
          dateCreated,
        )
      : new CblBlockMetadata(
          blockSize,
          blockType,
          BlockDataType.EphemeralStructuredData,
          blockDataLength, // originalDataLength (lengthWithoutPadding)
          fileDataLength, // fileDataLength
          creator ?? creatorId,
          dateCreated,
        );

    super(
      blockType,
      BlockDataType.EphemeralStructuredData,
      data,
      checksum,
      metadata, // Pass the specific metadata instance
    );

    // Now assign injected services to instance properties *after* super()
    this.cblService = cblService;
    this.checksumService = checksumService;

    // Cache the address count to avoid circular dependency
    this._cachedAddressCount = this.cblService.getCblAddressCount(this._data);

    // Validation needs to happen after super() and service assignment
    // Pass the correct block size to validateSignature
    if (creator && !this.validateSignature(this.blockSize)) {
      throw new CblError(CblErrorType.InvalidSignature);
    }
  }

  /**
   * Ensure the header has been validated. If not and a creator is available,
   * validate it and cache the result. Otherwise, throw an error.
   */
  protected ensureHeaderValidated(): void {
    if (!CBLBase.validatedHeaderCache.has(this._data)) {
      if (!this._creator) {
        return;
      }
      if (!this.validateSignature()) {
        throw new CblError(CblErrorType.InvalidSignature);
      }
      CBLBase.validatedHeaderCache.set(this._data, true);
    }
  }

  /**
   * Validate the signature of the CBL header
   */
  public get headerValidated(): boolean {
    if (!this._creator) {
      return false;
    }
    if (!CBLBase.validatedHeaderCache.has(this._data)) {
      const result = this.validateSignature();
      CBLBase.validatedHeaderCache.set(this._data, result);
      return result;
    }
    return CBLBase.validatedHeaderCache.get(this._data) === true;
  }

  /**
   * The number of addresses in the CBL
   */
  public get cblAddressCount(): number {
    // Use cached value if available to avoid circular dependency
    if (this._cachedAddressCount !== null) {
      return this._cachedAddressCount;
    }

    this.ensureHeaderValidated();
    this._cachedAddressCount = this.cblService.getCblAddressCount(this._data);
    return this._cachedAddressCount;
  }

  /**
   * The length of the original data represented by the CBL
   */
  public get originalDataLength(): number {
    this.ensureHeaderValidated();
    return this.cblService.getOriginalDataLength(this._data);
  }

  /**
   * The size of each address tuple in bytes
   */
  public get tupleSize(): number {
    this.ensureHeaderValidated();
    return this.cblService.getTupleSize(this._data);
  }

  /**
   * Whether the CBL has an extended header
   */
  public get isExtendedCbl(): boolean {
    this.ensureHeaderValidated();
    return this.cblService.isExtendedHeader(this._data);
  }

  /**
   * The signature of the creator of the CBL
   */
  public get creatorSignature(): SignatureBuffer {
    this.ensureHeaderValidated();
    return this.cblService.getSignature(this._data);
  }

  /**
   * The ID of the creator of the CBL
   */
  public get creatorId(): GuidV4 {
    this.ensureHeaderValidated();
    return this.cblService.getCreatorId(this._data);
  }

  /**
   * The data that follows the header in the CBL
   */
  public get addressData(): Buffer {
    this.ensureHeaderValidated();
    return this.cblService.getAddressData(this._data);
  }

  /**
   * The addresses in the CBL
   */
  public get addresses(): ChecksumBuffer[] {
    this.ensureHeaderValidated();
    return this.cblService.addressDataToAddresses(this._data);
  }

  /**
   * The address data for the CBL.
   */
  public override get layerPayload(): Buffer {
    return this.addressData;
  }

  public override get totalOverhead(): number {
    return super.totalOverhead + this.cblService.getHeaderLength(this.data);
  }

  /**
   * Validate the CBL structure and metadata
   */
  public override validateSync(): void {
    // Validate base CBL structure
    super.validateSync();

    if (this._creator === undefined) {
      throw new CblError(CblErrorType.CreatorUndefined);
    }

    if (!this.headerValidated) {
      throw new CblError(CblErrorType.InvalidStructure);
    }
  }

  /**
   * Validate the CBL structure and metadata, async
   */
  public override async validateAsync(): Promise<void> {
    // Validate base CBL structure
    await super.validateAsync();

    if (this.creator === undefined) {
      throw new CblError(CblErrorType.CreatorUndefined);
    }

    if (this._creator === undefined) {
      throw new CblError(CblErrorType.CreatorUndefined);
    }

    if (!this.headerValidated) {
      throw new CblError(CblErrorType.InvalidStructure);
    }
  }

  /**
   * Validate the signature of the creator of the CBL
   * @param blockSize The block size to use for validation (optional, defaults to calculated from data length if not provided to cblService.validateSignature)
   */
  public validateSignature(blockSize?: BlockSize): boolean {
    // Added optional blockSize parameter
    if (!this._creator) {
      return false;
    }

    // Use the CBLService's validateSignature method
    // Pass the explicitly provided block size if available
    return this.cblService.validateSignature(
      this._data,
      this._creator as BrightChainMember,
      blockSize ?? this.blockSize, // Pass the block size explicitly
    );
  }

  /**
   * Get the layer header data from the CBL
   */
  public override get layerHeaderData(): Buffer {
    this.ensureHeaderValidated();
    const headerLength = this.cblService.getHeaderLength(this.data);
    return this.data.subarray(0, headerLength);
  }

  /**
   * Get Block Handle Tuples for the CBL block
   */
  public async getHandleTuples<T extends EphemeralBlock>(
    getDiskBlockPath: (id: ChecksumBuffer, blockSize: BlockSize) => string,
    blockConstructor?: new (...args: unknown[]) => T,
  ): Promise<Array<BlockHandleTuple>> {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const handleTuples: Array<BlockHandleTuple> = [];
    const blockIds = this.addresses;
    const tupleSize = this.tupleSize;
    for (let i = 0; i < blockIds.length; i += tupleSize) {
      const tupleIds = blockIds.slice(i, i + tupleSize);
      const handles = await Promise.all(
        tupleIds.map(async (id) => {
          // Use the class-based API if blockConstructor is not provided
          if (!blockConstructor) {
            return await createBlockHandleFromPath(
              this.checksumService,
              EphemeralBlock as unknown as new (...args: unknown[]) => T,
              getDiskBlockPath(id, this.blockSize),
              this.blockSize,
              id,
              true, // canRead
              true, // canPersist
            );
          } else {
            // Use the class-based API if blockConstructor is provided
            return await createBlockHandleFromPath(
              this.checksumService,
              blockConstructor,
              getDiskBlockPath(id, this.blockSize),
              this.blockSize,
              id,
              true, // canRead
              true, // canPersist
            );
          }
        }),
      );
      handleTuples.push(new BlockHandleTuple(handles));
    }

    return handleTuples;
  }
}
