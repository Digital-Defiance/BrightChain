import { BrightChainMember } from '../brightChainMember';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import BlockDataType from '../enumerations/blockDataType';
import { BlockMetadataErrorType } from '../enumerations/blockMetadataErrorType';
import { BlockSize, lengthToBlockSize } from '../enumerations/blockSizes';
import BlockType from '../enumerations/blockType';
import { CblErrorType } from '../enumerations/cblErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockAccessError, BlockMetadataError } from '../errors/block';
import { CblError } from '../errors/cblError';
import { GuidV4 } from '../guid';
import { ICBLCore } from '../interfaces/blocks/cblBase';
import { ServiceLocator } from '../services/serviceLocator';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';
import { BlockHandle } from './handle';
import { BlockHandleTuple } from './handleTuple';

/**
 * Shared core functionality between CBL/ECBL
 */
export abstract class CBLBase extends EphemeralBlock implements ICBLCore {
  /** Cache for validated headers */
  private static validatedHeaderCache = new WeakMap<Buffer, boolean>();

  /** Cache for address count to avoid circular dependency */
  private _cachedAddressCount: number | null = null;

  /**
   * Create a new CBL core
   * @param data The data of the CBL
   */
  constructor(data: Buffer, creator: BrightChainMember) {
    const isExtendedCbl =
      ServiceLocator.getServiceProvider().cblService.isExtendedHeader(data);
    const checksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        data,
      );
    const blockSize = lengthToBlockSize(data.length);
    const blockType = isExtendedCbl
      ? BlockType.ExtendedConstituentBlockListBlock
      : BlockType.ConstituentBlockList;
    const dateCreated =
      ServiceLocator.getServiceProvider().cblService.getDateCreated(data);
    const creatorId =
      ServiceLocator.getServiceProvider().cblService.getCreatorId(data);
    if (
      (creator instanceof BrightChainMember && !creatorId.equals(creator.id)) ||
      (creator instanceof GuidV4 && !creatorId.equals(creator))
    ) {
      throw new BlockMetadataError(BlockMetadataErrorType.CreatorIdMismatch);
    }
    super(
      blockType,
      BlockDataType.EphemeralStructuredData,
      data,
      checksum,
      new EphemeralBlockMetadata(
        blockSize,
        blockType,
        BlockDataType.EphemeralStructuredData,
        ServiceLocator.getServiceProvider().cblService.getBlockDataLength(data),
        false,
        creator ?? creatorId,
        dateCreated,
      ),
    );

    // Cache the address count to avoid circular dependency
    this._cachedAddressCount =
      ServiceLocator.getServiceProvider().cblService.getCblAddressCount(
        this._data,
      );

    if (creator && !this.validateSignature()) {
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
    this._cachedAddressCount =
      ServiceLocator.getServiceProvider().cblService.getCblAddressCount(
        this._data,
      );
    return this._cachedAddressCount;
  }

  /**
   * The length of the original data represented by the CBL
   */
  public get originalDataLength(): number {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getOriginalDataLength(
      this._data,
    );
  }

  /**
   * The size of each address tuple in bytes
   */
  public get tupleSize(): number {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getTupleSize(
      this._data,
    );
  }

  /**
   * Whether the CBL has an extended header
   */
  public get isExtendedCbl(): boolean {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.isExtendedHeader(
      this._data,
    );
  }

  /**
   * The signature of the creator of the CBL
   */
  public get creatorSignature(): SignatureBuffer {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getSignature(
      this._data,
    );
  }

  /**
   * The ID of the creator of the CBL
   */
  public get creatorId(): GuidV4 {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getCreatorId(
      this._data,
    );
  }

  /**
   * The data that follows the header in the CBL
   */
  public get addressData(): Buffer {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.getAddressData(
      this._data,
    );
  }

  /**
   * The addresses in the CBL
   */
  public get addresses(): ChecksumBuffer[] {
    this.ensureHeaderValidated();
    return ServiceLocator.getServiceProvider().cblService.addressDataToAddresses(
      this._data,
    );
  }

  /**
   * The address data for the CBL.
   */
  public override get payload(): Buffer {
    return this.addressData;
  }

  public override get availableCapacity(): number {
    const result =
      ServiceLocator.getServiceProvider().blockCapacityCalculator.calculateCapacity(
        {
          blockSize: this.blockSize,
          blockType: this.blockType,
          usesStandardEncryption: false,
        },
      );
    return result.availableCapacity;
  }

  public override get totalOverhead(): number {
    return (
      super.totalOverhead +
      ServiceLocator.getServiceProvider().cblService.getHeaderLength(this.data)
    );
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
   * @param creator
   */
  public validateSignature(): boolean {
    if (!this._creator) {
      return false;
    }

    // Use the CBLService's validateSignature method
    // This ensures we use the same logic for validation as we do for creation
    return ServiceLocator.getServiceProvider().cblService.validateSignature(
      this._data,
      this._creator as BrightChainMember,
      this.blockSize,
    );
  }

  /**
   * Get the layer header data from the CBL
   */
  public override get layerHeaderData(): Buffer {
    this.ensureHeaderValidated();
    const headerLength =
      ServiceLocator.getServiceProvider().cblService.getHeaderLength(this.data);
    return this.data.slice(0, headerLength);
  }

  /**
   * Get Block Handle Tuples for the CBL block
   */
  public async getHandleTuples(
    getDiskBlockPath: (id: ChecksumBuffer, blockSize: BlockSize) => string,
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
        tupleIds.map((id) =>
          BlockHandle.createFromPath(
            getDiskBlockPath(id, this.blockSize),
            this.blockSize,
            id,
            true, // canRead
            true, // canPersist
          ),
        ),
      );
      handleTuples.push(new BlockHandleTuple(handles));
    }

    return handleTuples;
  }
}
