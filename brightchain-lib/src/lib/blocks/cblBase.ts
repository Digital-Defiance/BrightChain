import { BrightChainMember } from '../brightChainMember';
import CONSTANTS, { CHECKSUM } from '../constants';
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
import { CBLService } from '../services/cblService';
import { ServiceProvider } from '../services/service.provider';
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

  /**
   * Create a new CBL core
   * @param data The data of the CBL
   */
  constructor(data: Buffer, creator: BrightChainMember) {
    const isExtendedCbl =
      ServiceProvider.getInstance().cblService.isExtendedHeader(data);
    const checksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(data);
    const blockSize = lengthToBlockSize(data.length);
    const blockType = isExtendedCbl
      ? BlockType.ExtendedConstituentBlockListBlock
      : BlockType.ConstituentBlockList;
    const dateCreated =
      ServiceProvider.getInstance().cblService.getDateCreated(data);
    const creatorId =
      ServiceProvider.getInstance().cblService.getCreatorId(data);
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
        ServiceProvider.getInstance().cblService.getBlockDataLength(data),
        false,
        creator ?? creatorId,
        dateCreated,
      ),
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
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getCblAddressCount(
      this._data,
    );
  }

  /**
   * The length of the original data represented by the CBL
   */
  public get originalDataLength(): number {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getOriginalDataLength(
      this._data,
    );
  }

  /**
   * The size of each address tuple in bytes
   */
  public get tupleSize(): number {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getTupleSize(this._data);
  }

  /**
   * Whether the CBL has an extended header
   */
  public get isExtendedCbl(): boolean {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.isExtendedHeader(
      this._data,
    );
  }

  /**
   * The signature of the creator of the CBL
   */
  public get creatorSignature(): SignatureBuffer {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getSignature(this._data);
  }

  /**
   * The ID of the creator of the CBL
   */
  public get creatorId(): GuidV4 {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getCreatorId(this._data);
  }

  /**
   * The data that follows the header in the CBL
   */
  public get addressData(): Buffer {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.getAddressData(this._data);
  }

  /**
   * The addresses in the CBL
   */
  public get addresses(): ChecksumBuffer[] {
    this.ensureHeaderValidated();
    return ServiceProvider.getInstance().cblService.addressDataToAddresses(
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
      ServiceProvider.getInstance().blockCapacityCalculator.calculateCapacity({
        blockSize: this.blockSize,
        blockType: this.blockType,
        usesStandardEncryption: false,
      });
    return result.availableCapacity;
  }

  public override get totalOverhead(): number {
    return (
      super.totalOverhead +
      ServiceProvider.getInstance().cblService.getHeaderLength(this.data)
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
    const headerLength =
      ServiceProvider.getInstance().cblService.getHeaderLength(this._data);
    const headerWithoutSignature = this._data.slice(
      0,
      headerLength - CBLService.CreatorSignatureSize,
    );

    // Reuse pre-allocated buffer
    const blockSizeBuffer = Buffer.allocUnsafe(CONSTANTS.UINT32_SIZE);
    blockSizeBuffer.writeUInt32BE(lengthToBlockSize(this._data.length));

    // Get address list without creating new buffer
    const addressList = this._data.slice(
      headerLength,
      headerLength + this.cblAddressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
    );

    // Pre-allocate exact size needed for toSign
    const toSignSize =
      headerWithoutSignature.length +
      blockSizeBuffer.length +
      addressList.length;
    const toSign = Buffer.allocUnsafe(toSignSize);

    // Copy buffers directly into pre-allocated space using unwrapped buffers
    let offset = 0;
    headerWithoutSignature.copy(toSign, offset);
    offset += headerWithoutSignature.length;
    blockSizeBuffer.copy(toSign, offset);
    offset += blockSizeBuffer.length;
    addressList.copy(toSign, offset);

    const checksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(toSign);
    return ServiceProvider.getInstance().eciesService.verifyMessage(
      this._creator.publicKey,
      checksum,
      this.creatorSignature,
    );
  }

  /**
   * Get the layer header data from the CBL
   */
  public override get layerHeaderData(): Buffer {
    this.ensureHeaderValidated();
    const headerLength =
      ServiceProvider.getInstance().cblService.getHeaderLength(this.data);
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
