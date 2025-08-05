import { BrightChainMember } from '../brightChainMember';
import CONSTANTS, { ECIES, ENCRYPTION } from '../constants';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockErrorType } from '../enumerations/blockErrorType';
import { BlockSize } from '../enumerations/blockSize';
import {
  BlockType,
  EncryptedBlockTypes,
  EphemeralBlockTypes,
} from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import {
  BlockAccessError,
  BlockError,
  BlockValidationError,
  CannotEncryptBlockError,
} from '../errors/block';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/blocks/encrypted';
import { IEphemeralBlock } from '../interfaces/blocks/ephemeral';
import { IMultiEncryptedParsedHeader } from '../interfaces/multiEncryptedParsedHeader';
import { ISingleEncryptedParsedHeader } from '../interfaces/singleEncryptedParsedHeader';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { ChecksumBuffer, RawGuidBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';

/**
 * Base class for encrypted blocks.
 * Adds encryption-specific header data and overhead calculations.
 *
 * Block Structure:
 * [Layer 0 Header][Layer 1 Header][...][Encryption Header][Encrypted Payload][Padding]
 *
 * Single Encryption Header:
 * [Encryption Type (1 byte)][Recipient GUID (16 bytes)][Ephemeral Public Key (65 bytes)][IV (16 bytes)][Auth Tag (16 bytes)][Data]
 *
 * Multi Encryption Header:
 * [Encryption Type (1 byte)][Data Length (8 bytes)][Recipient count (2 bytes)][Recipient GUIDs (16 bytes * recipientCount)][Recipient keys (129 bytes)][Data]
 */
export class EncryptedBlock extends EphemeralBlock implements IEncryptedBlock {
  protected readonly _encryptionType: BlockEncryptionType;
  protected readonly _recipients: Array<GuidV4>;
  protected readonly _recipientWithKey: BrightChainMember;
  protected _cachedEncryptionDetails?:
    | ISingleEncryptedParsedHeader
    | IMultiEncryptedParsedHeader = undefined;

  /**
   * Creates an instance of EncryptedBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param metadata - The block metadata
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  public constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EncryptedBlockMetadata,
    recipientWithKey: BrightChainMember,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
    const blockEncryptionType = this.layerHeaderData.readUint8(
      0,
    ) as BlockEncryptionType;
    if (
      metadata.encryptionType !== blockEncryptionType ||
      !Object.values(BlockEncryptionType).includes(blockEncryptionType)
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionType,
      );
    }
    this._encryptionType = blockEncryptionType;
    if (blockEncryptionType === BlockEncryptionType.SingleRecipient) {
      this._recipients = [
        new GuidV4(
          this.layerHeaderData.subarray(
            ENCRYPTION.ENCRYPTION_TYPE_SIZE,
            ENCRYPTION.ENCRYPTION_TYPE_SIZE + ENCRYPTION.RECIPIENT_ID_SIZE,
          ) as RawGuidBuffer,
        ),
      ];
    } else {
      this._recipients = (
        this.encryptionDetails as IMultiEncryptedParsedHeader
      ).recipientIds;
    }
    if (!recipientWithKey.hasPrivateKey) {
      throw new BlockValidationError(
        BlockValidationErrorType.EncryptionRecipientHasNoPrivateKey,
      );
    } else if (!this._recipients.some((r) => r.equals(recipientWithKey.id))) {
      throw new BlockValidationError(
        BlockValidationErrorType.EncryptionRecipientNotFoundInRecipients,
      );
    }
    this._recipientWithKey = recipientWithKey;
  }

  /**
   * Create a new encrypted block from data
   */
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator: BrightChainMember,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead?: boolean,
    canPersist?: boolean,
    recipientWithKey?: BrightChainMember,
    recipientCount?: number,
  ): Promise<EncryptedBlock> {
    const encryptionType = data.readUint8(0) as BlockEncryptionType;
    return new EncryptedBlock(
      type,
      dataType,
      data,
      checksum,
      new EncryptedBlockMetadata(
        blockSize,
        type,
        dataType,
        lengthBeforeEncryption ?? data.length,
        creator,
        encryptionType,
        recipientCount ?? 1,
        dateCreated,
      ),
      recipientWithKey ?? creator,
      canRead,
      canPersist,
    );
  }

  /**
   * Whether the block can be encrypted
   * Always returns false since this block is already encrypted
   */
  public override canEncrypt(): boolean {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public override canMultiEncrypt(recipientCount: number): boolean {
    return false;
  }

  public override async encrypt<E>(): Promise<E> {
    throw new CannotEncryptBlockError();
  }

  /**
   * The type of encryption used for the block
   */
  public get encryptionType(): BlockEncryptionType {
    return this._encryptionType;
  }

  /**
   * The recipients of the block
   */
  public get recipients(): Array<GuidV4> {
    return this._recipients;
  }

  public get recipientWithKey(): BrightChainMember {
    return this._recipientWithKey;
  }

  /**
   * The encryption details parsed from the header
   */
  public get encryptionDetails():
    | ISingleEncryptedParsedHeader
    | IMultiEncryptedParsedHeader {
    if (this._cachedEncryptionDetails) {
      return this._cachedEncryptionDetails;
    }
    const encryptionType = this.encryptionType;
    if (encryptionType === BlockEncryptionType.SingleRecipient) {
      this._cachedEncryptionDetails =
        ServiceLocator.getServiceProvider().eciesService.parseSingleEncryptedHeader(
          this.layerHeaderData.subarray(
            ENCRYPTION.ENCRYPTION_TYPE_SIZE + ENCRYPTION.RECIPIENT_ID_SIZE,
          ),
        );
    } else if (encryptionType === BlockEncryptionType.MultiRecipient) {
      this._cachedEncryptionDetails =
        ServiceLocator.getServiceProvider().eciesService.parseMultiEncryptedHeader(
          this.layerHeaderData.subarray(ENCRYPTION.ENCRYPTION_TYPE_SIZE),
        );
    } else {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    }
    return this._cachedEncryptionDetails;
  }

  public async decrypt<D extends IEphemeralBlock>(
    newBlockType: BlockType,
  ): Promise<D> {
    if (!EphemeralBlockTypes.includes(newBlockType)) {
      throw new BlockError(BlockErrorType.InvalidNewBlockType);
    } else if (!EncryptedBlockTypes.includes(this.blockType)) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    } else if (!this.recipientWithKey) {
      throw new BlockError(BlockErrorType.RecipientRequired);
    } else if (this.recipientWithKey.privateKey === undefined) {
      throw new BlockError(BlockErrorType.CreatorPrivateKeyRequired);
    }

    return (
      this.encryptionType === BlockEncryptionType.SingleRecipient
        ? await ServiceLocator.getServiceProvider().blockService.decrypt(
            this.recipientWithKey,
            this,
            newBlockType,
          )
        : await ServiceLocator.getServiceProvider().blockService.decryptMultiple(
            this.recipientWithKey,
            this,
          )
    ) as D;
  }

  /**
   * The block type stored in the header
   */
  public get blockTypeHeader(): BlockType {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this.layerHeaderData.readUInt8(0) as BlockType;
  }

  /**
   * The total overhead of the block, including encryption overhead
   * For encrypted blocks, the overhead is just the ECIES overhead since the
   * encryption header is part of the data buffer
   */
  public override get layerOverheadSize(): number {
    return (
      (this.encryptionType === BlockEncryptionType.SingleRecipient
        ? ECIES.OVERHEAD_SIZE +
          ENCRYPTION.ENCRYPTION_TYPE_SIZE +
          ENCRYPTION.RECIPIENT_ID_SIZE
        : ServiceLocator.getServiceProvider().eciesService.calculateECIESMultipleRecipientOverhead(
            (this.encryptionDetails as IMultiEncryptedParsedHeader)
              .recipientCount,
            false,
          )) + ENCRYPTION.ENCRYPTION_TYPE_SIZE
    );
  }

  /**
   * Get this layer's header data (encryption metadata)
   */
  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    // For encrypted blocks, the header is always at the start of the data
    // since EphemeralBlock has no header data
    return this.data.subarray(0, this.layerOverheadSize);
  }

  /**
   * Get the encrypted payload data (excluding the encryption header and padding)
   */
  public override get layerPayload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    const headerLength = this.layerOverheadSize;
    return this.data.subarray(
      headerLength,
      headerLength + this.layerPayloadSize,
    );
  }

  /**
   * Get the length of the payload including padding
   */
  public override get layerPayloadSize(): number {
    return this.encryptionType === BlockEncryptionType.SingleRecipient
      ? ECIES.OVERHEAD_SIZE
      : ECIES.MULTIPLE.BASE_OVERHEAD_SIZE;
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override async validateAsync(): Promise<void> {
    // Call parent validation first
    await super.validateAsync();

    // Validate encryption header lengths
    if (this.layerHeaderData.length !== ECIES.OVERHEAD_SIZE) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionHeaderLength,
      );
    }

    if (this.encryptionType === BlockEncryptionType.SingleRecipient) {
      const details: ISingleEncryptedParsedHeader = this
        .encryptionDetails as ISingleEncryptedParsedHeader;

      // Validate individual components
      if (details.ephemeralPublicKey.length !== ECIES.PUBLIC_KEY_LENGTH) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
        );
      }
      if (details.iv.length !== ECIES.IV_LENGTH) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidIVLength,
        );
      }
      if (details.authTag.length !== ECIES.AUTH_TAG_LENGTH) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidAuthTagLength,
        );
      }
    } else if (this.encryptionType === BlockEncryptionType.MultiRecipient) {
      const details: IMultiEncryptedParsedHeader = this
        .encryptionDetails as IMultiEncryptedParsedHeader;

      if (details.recipientCount < 2) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientCount,
        );
      } else if (details.recipientIds.length !== details.recipientCount) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientIds,
        );
      } else if (
        details.recipientIds
          .map((id) => id.asRawGuidBuffer)
          .some((id) => id.length !== CONSTANTS.GUID_SIZE)
      ) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientIds,
        );
      } else if (
        details.recipientKeys.some(
          (k) => k.length !== ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE,
        )
      ) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientKeys,
        );
      }
    }

    // Validate data length
    if (this.data.length !== this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
      );
    }

    // Validate actual data length
    if (
      this.lengthBeforeEncryption >
      ServiceProvider.getInstance().blockCapacityCalculator.calculateCapacity({
        blockSize: this.blockSize,
        blockType: this.blockType,
        encryptionType: this.encryptionType,
        recipientCount: this.recipients.length,
      }).availableCapacity
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }

  /**
   * Synchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validateSync(): void {
    // Call parent validation first
    super.validateSync();

    // Validate encryption header lengths
    if (this.layerHeaderData.length !== ECIES.OVERHEAD_SIZE) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEncryptionHeaderLength,
      );
    }

    if (this._encryptionType === BlockEncryptionType.SingleRecipient) {
      const details = this.encryptionDetails as ISingleEncryptedParsedHeader;
      // Validate individual components
      if (details.ephemeralPublicKey.length !== ECIES.PUBLIC_KEY_LENGTH) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
        );
      }
      if (details.iv.length !== ECIES.IV_LENGTH) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidIVLength,
        );
      }
      if (details.authTag.length !== ECIES.AUTH_TAG_LENGTH) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidAuthTagLength,
        );
      }
    } else if (this._encryptionType === BlockEncryptionType.MultiRecipient) {
      const details = this.encryptionDetails as IMultiEncryptedParsedHeader;
      if (details.recipientCount < 2) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientCount,
        );
      }
      if (details.recipientIds.length != details.recipientCount) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientIds,
        );
      }
      if (details.recipientKeys.length != details.recipientCount) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientKeys,
        );
      }
    }

    // Validate data length
    if (this.data.length !== this.blockSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataBufferIsTruncated,
      );
    }

    // Validate actual data length
    if (
      this.lengthBeforeEncryption >
      ServiceProvider.getInstance().blockCapacityCalculator.calculateCapacity({
        blockSize: this.blockSize,
        blockType: this.blockType,
        encryptionType: this.encryptionType,
        recipientCount: this.recipients.length,
      }).availableCapacity
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }
  }

  /**
   * Alias for validateSync() to maintain compatibility
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override validate(): void {
    this.validateSync();
  }
}
