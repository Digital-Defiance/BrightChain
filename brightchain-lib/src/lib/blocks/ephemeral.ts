import { Member, type PlatformID } from '@digitaldefiance/ecies-lib';
import { randomBytes } from '../browserCrypto';
import { Readable } from '../browserStream';
import { ECIES } from '../constants';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockErrorType } from '../enumerations/blockErrorType';
import { BlockMetadataErrorType } from '../enumerations/blockMetadataErrorType';
import { BlockSize } from '../enumerations/blockSize';
import {
  BlockType,
  EncryptedBlockTypes,
  EphemeralBlockTypes,
} from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import {
  BlockAccessError,
  BlockError,
  BlockMetadataError,
  BlockValidationError,
} from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { IEphemeralBlock } from '../interfaces/blocks/ephemeral';
import { ServiceLocator } from '../services/serviceLocator';
import { Checksum } from '../types/checksum';
import { BaseBlock } from './base';
// Remove circular import
// import { EncryptedBlock } from './encrypted';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { IEncryptedBlock } from '../interfaces/blocks/encrypted';

/**
 * Ephemeral blocks are blocks that are not stored on disk, but are either input blocks or reconstituted blocks.
 * Ephemeral blocks should never be written to disk and are therefore memory-only.
 */
export class EphemeralBlock<TID extends PlatformID = Uint8Array>
  extends BaseBlock
  implements IEphemeralBlock<TID>
{
  /**
   * Creates a new ephemeral block
   */
  public static async from<TID extends PlatformID = Uint8Array>(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Uint8Array,
    checksum: Checksum,
    creator: Member<TID>,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead = true,
    canPersist = true,
  ): Promise<IEphemeralBlock<TID>> {
    // Skip validation in test environment
    const calculatedChecksum =
      await ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        data,
      );

    if (!calculatedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, calculatedChecksum);
    }

    const metadata: EphemeralBlockMetadata<TID> =
      new EphemeralBlockMetadata<TID>(
        blockSize,
        type,
        dataType,
        lengthBeforeEncryption ?? data.length,
        creator,
        dateCreated ?? new Date(),
      );

    return new EphemeralBlock<TID>(
      type,
      dataType,
      data,
      checksum,
      metadata,
      canRead,
      canPersist,
    );
  }

  /**
   * The data in the block
   */
  protected readonly _data: Uint8Array;

  /**
   * The block creator object
   */
  protected readonly _creator: Member<TID>;

  /**
   * Create a new ephemeral block
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The data in the block
   * @param checksum - The id/checksum of the block
   * @param dateCreated - The date the block was created
   * @param metadata - Optional block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted (defaults to false for ephemeral blocks)
   * @param encrypted - Whether the block is encrypted
   */
  public constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Uint8Array | Readable,
    checksum: Checksum,
    metadata: EphemeralBlockMetadata<TID>,
    canRead = true,
    canPersist = false,
  ) {
    if (data instanceof Readable) {
      throw new BlockValidationError(
        BlockValidationErrorType.EphemeralBlockOnlySupportsBufferData,
      );
    }

    // Initialize base class
    super(type, dataType, checksum, metadata, canRead, canPersist);

    // Validate data length against block size
    const maxDataSize = metadata.size;
    if (data.length > maxDataSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    // Handle padding
    let paddedData = data;
    if (paddedData.length < maxDataSize) {
      // Pad with random data to reach the full block size
      const padding = randomBytes(maxDataSize - paddedData.length);
      const result = new Uint8Array(paddedData.length + padding.length);
      result.set(paddedData);
      result.set(padding, paddedData.length);
      paddedData = result;
    }

    if (!metadata) {
      throw new BlockMetadataError(BlockMetadataErrorType.MetadataRequired);
    }

    // Store block properties
    this._data = paddedData;

    // Handle creator from metadata
    this._creator = metadata.creator;
  }

  /**
   * The data in the block
   */
  public override get data(): Uint8Array {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this._data;
  }

  /**
   * The date the block was created
   */
  public override get dateCreated(): Date {
    return this._dateCreated;
  }

  /**
   * The actual data length of the block before any encryption or padding overhead
   */
  public get lengthBeforeEncryption(): number {
    return this._lengthBeforeEncryption;
  }

  /**
   * Whether the block can be encrypted
   */
  public canEncrypt(): boolean {
    let encryptedBlockType: BlockType = BlockType.EncryptedOwnedDataBlock;
    if (this.blockType === BlockType.ConstituentBlockList) {
      encryptedBlockType = BlockType.EncryptedConstituentBlockListBlock;
    } else if (
      this.blockType === BlockType.EncryptedExtendedConstituentBlockListBlock
    ) {
      encryptedBlockType = BlockType.EncryptedExtendedConstituentBlockListBlock;
    }
    const capacity =
      ServiceLocator.getServiceProvider().blockCapacityCalculator.calculateCapacity(
        {
          blockSize: this.blockSize,
          blockType: encryptedBlockType,
          encryptionType: BlockEncryptionType.SingleRecipient,
        },
      );
    return (
      this._lengthBeforeEncryption + ECIES.OVERHEAD_SIZE <=
      capacity.availableCapacity
    );
  }

  /**
   * Whether the block can be encrypted for multiple recipients
   * @param recipientCount number of recipients
   * @returns
   */
  public canMultiEncrypt(recipientCount: number): boolean {
    let encryptedBlockType: BlockType = BlockType.EncryptedOwnedDataBlock;
    if (this.blockType === BlockType.ConstituentBlockList) {
      encryptedBlockType = BlockType.EncryptedConstituentBlockListBlock;
    } else if (
      this.blockType === BlockType.EncryptedExtendedConstituentBlockListBlock
    ) {
      encryptedBlockType = BlockType.EncryptedExtendedConstituentBlockListBlock;
    }
    const capacity =
      ServiceLocator.getServiceProvider().blockCapacityCalculator.calculateCapacity(
        {
          blockSize: this.blockSize,
          blockType: encryptedBlockType,
          recipientCount: recipientCount,
          encryptionType: BlockEncryptionType.MultiRecipient,
        },
      );
    const overhead =
      ServiceLocator.getServiceProvider().eciesService.calculateECIESMultipleRecipientOverhead(
        recipientCount,
        true,
      );
    return (
      this._lengthBeforeEncryption + overhead <= capacity.availableCapacity
    );
  }

  /**
   * Synchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   */
  public override validateSync(): void {
    // For both encrypted and unencrypted blocks,
    // validate against the provided checksum
    if (!this.idChecksum) {
      throw new BlockValidationError(BlockValidationErrorType.NoChecksum);
    }

    // Calculate checksum on actual data length, excluding padding
    const computedChecksum =
      ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        this._data,
      );
    const validated = computedChecksum.equals(this.idChecksum);
    if (!validated) {
      throw new ChecksumMismatchError(this.idChecksum, computedChecksum);
    }
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If checksums do not match
   */
  public override async validateAsync(): Promise<void> {
    // For both encrypted and unencrypted blocks,
    // validate against the provided checksum
    if (!this.idChecksum) {
      throw new BlockValidationError(BlockValidationErrorType.NoChecksum);
    }

    // Calculate checksum on actual data length, excluding padding
    const computedChecksum =
      await ServiceLocator.getServiceProvider().checksumService.calculateChecksum(
        this._data,
      );
    const validated = computedChecksum.equals(this.idChecksum);
    if (!validated) {
      throw new ChecksumMismatchError(this.idChecksum, computedChecksum);
    }
  }

  /**
   * The block creator object
   * Only returns Member creators, not GuidV4 IDs
   */
  public get creator(): Member<TID> | undefined {
    return this._creator || undefined;
  }

  public override get layerOverheadSize(): number {
    return 0;
  }

  /**
   * Get this layer's header data
   */
  public override get layerHeaderData(): Uint8Array {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // Return empty buffer by default, but allow derived classes to override
    return new Uint8Array(0);
  }

  /**
   * Get the payload data not including headers or padding
   */
  public override get layerPayload(): Uint8Array {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this.layerData.subarray(
      this.layerOverheadSize,
      this.layerOverheadSize + this.layerPayloadSize,
    );
  }

  /**
   * Get the length of the payload not counting padding
   */
  public get layerPayloadSize(): number {
    return this._lengthBeforeEncryption;
  }

  /**
   * Encrypt this block using the creator's public key
   * @param creator The member who will own the encrypted block
   * @returns A new EncryptedOwnedDataBlock
   */
  public async encrypt<E extends IEncryptedBlock<TID>>(
    newBlockType: BlockType,
    recipients?: Member<TID>[],
  ): Promise<E> {
    const encryptedBlockType: BlockEncryptionType =
      recipients && recipients.length >= 2
        ? BlockEncryptionType.MultiRecipient
        : BlockEncryptionType.SingleRecipient;

    if (recipients && recipients.length === 0) {
      throw new BlockError(BlockErrorType.RecipientRequired);
    }

    if (!EncryptedBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.InvalidNewBlockType);
    } else if (!EphemeralBlockTypes.includes(this.blockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!this.creator) {
      throw new BlockError(BlockErrorType.CreatorRequiredForEncryption);
    } else if (
      encryptedBlockType === BlockEncryptionType.MultiRecipient &&
      (recipients === undefined ||
        recipients.length < 2 ||
        recipients.length > ECIES.MULTIPLE.MAX_RECIPIENTS)
    ) {
      throw new BlockError(BlockErrorType.InvalidMultiEncryptionRecipientCount);
    } else if (
      encryptedBlockType === BlockEncryptionType.SingleRecipient &&
      !this.canEncrypt()
    ) {
      throw new BlockError(BlockErrorType.CannotEncrypt);
    } else if (
      encryptedBlockType === BlockEncryptionType.MultiRecipient &&
      recipients &&
      !this.canMultiEncrypt(recipients.length)
    ) {
      throw new BlockError(BlockErrorType.CannotEncrypt);
    }

    // Encrypt using BlockService
    const encryptedBlock =
      encryptedBlockType === BlockEncryptionType.MultiRecipient && recipients
        ? await ServiceLocator.getServiceProvider<TID>().blockService.encryptMultiple(
            newBlockType,
            this,
            recipients,
          )
        : await ServiceLocator.getServiceProvider<TID>().blockService.encrypt(
            newBlockType,
            this,
            recipients ? recipients[0] : undefined,
          );

    // We can't use instanceof EncryptedBlock here due to circular dependency
    // Instead, check if it implements IEncryptedBlock interface or IMultiEncryptedBlock
    if (
      !encryptedBlock ||
      typeof encryptedBlock !== 'object' ||
      !('decrypt' in encryptedBlock) ||
      (encryptedBlockType === BlockEncryptionType.SingleRecipient &&
        !('ephemeralPublicKey' in encryptedBlock)) ||
      (encryptedBlockType === BlockEncryptionType.MultiRecipient &&
        !('recipientKeys' in encryptedBlock))
    ) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    }

    return encryptedBlock as unknown as E;
  }

  /**
   * Get the data for this layer, excluding the layer headers of lower-level layers
   * and including everything to the end of the block.
   */
  public get layerData(): Uint8Array {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }

    const startOffset = this.lowerLayerHeaderSize + this.layerOverheadSize;

    return this.data.subarray(startOffset, startOffset + this.layerPayloadSize);
  }
}
