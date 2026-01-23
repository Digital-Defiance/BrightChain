/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  arraysEqual,
  ECIES,
  EciesEncryptionTypeEnum,
  IMultiEncryptedParsedHeader,
  ISingleEncryptedParsedHeader,
  Member,
  TypedIdProviderWrapper,
  UINT8_SIZE,
  type PlatformID,
} from '@digitaldefiance/ecies-lib';
import { calculateECIESMultipleRecipientOverhead } from '../browserConfig';
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
import { IEncryptedBlock } from '../interfaces/blocks/encrypted';
import { IEphemeralBlock } from '../interfaces/blocks/ephemeral';
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
import { EphemeralBlock } from './ephemeral';

/**
 * Base class for encrypted blocks.
 * Adds encryption-specific header data and overhead calculations.
 *
 * BrightChain adopts ecies-lib's versioned encryption format as the canonical standard.
 *
 * Block Structure:
 * [Layer 0 Header][Layer 1 Header][...][Encryption Header][Encrypted Payload][Padding]
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SINGLE-RECIPIENT ENCRYPTION (WITH_LENGTH format, type 0x42)
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * BrightChain uses WITH_LENGTH format for single-recipient encryption because:
 * 1. The data length field enables streaming decryption
 * 2. It's only 8 bytes more than BASIC
 * 3. Block sizes are known, making length verification valuable
 *
 * Byte Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │ [EncType][RecipientID][Version][CipherSuite][Type][PubKey][IV][AuthTag][Len][Data]  │
 * │ [1     ][idSize     ][1      ][1          ][1   ][33    ][12][16     ][8  ][...]   │
 * └─────────────────────────────────────────────────────────────────────────────────────┘
 *
 * | Offset      | Size   | Field            | Description                              |
 * |-------------|--------|------------------|------------------------------------------|
 * | 0           | 1      | EncryptionType   | BlockEncryptionType.SingleRecipient (1)  |
 * | 1           | idSize | RecipientID      | BrightChain routing ID                   |
 * | 1+idSize    | 1      | Version          | Protocol version (0x01)                  |
 * | 2+idSize    | 1      | CipherSuite      | AES-256-GCM (0x01)                       |
 * | 3+idSize    | 1      | EncryptionType   | WITH_LENGTH (0x42)                       |
 * | 4+idSize    | 33     | EphemeralPubKey  | Compressed secp256k1 public key          |
 * | 37+idSize   | 12     | IV               | Initialization vector (NIST SP 800-38D)  |
 * | 49+idSize   | 16     | AuthTag          | GCM authentication tag                   |
 * | 65+idSize   | 8      | DataLength       | Original data length (big-endian)        |
 * | 73+idSize   | ...    | EncryptedData    | Ciphertext                               |
 *
 * Total overhead: 1 + idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE = 1 + idSize + 72
 * Default (GUID, idSize=16): 1 + 16 + 72 = 89 bytes
 * ObjectID (idSize=12):      1 + 12 + 72 = 85 bytes
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * MULTI-RECIPIENT ENCRYPTION (MULTIPLE format, type 0x63)
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Byte Layout:
 * ┌─────────────────────────────────────────────────────────────────────────────────────┐
 * │ [EncType][Ver][CS][PubKey][IV][Tag][Len][Count][RecipientEntries...][EncryptedData] │
 * │ [1     ][1  ][1 ][33    ][12][16 ][8  ][2    ][variable           ][...]           │
 * └─────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Recipient Entry Layout (per recipient):
 * | Offset      | Size   | Field         | Description                               |
 * |-------------|--------|---------------|-------------------------------------------|
 * | 0           | idSize | RecipientID   | Recipient identifier                      |
 * | idSize      | 12     | KeyIV         | IV for this recipient's key encryption    |
 * | idSize+12   | 16     | KeyAuthTag    | Auth tag for key encryption               |
 * | idSize+28   | 32     | EncryptedKey  | Encrypted symmetric key                   |
 *
 * Per-recipient overhead: idSize + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE = idSize + 60
 *
 * Total overhead formula:
 *   1 + ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE + DATA_LENGTH_SIZE + RECIPIENT_COUNT_SIZE
 *     + (recipientCount * (idSize + ENCRYPTED_KEY_SIZE))
 *   = 1 + 64 + 8 + 2 + (recipientCount * (idSize + 60))
 *   = 75 + (recipientCount * (idSize + 60))
 *
 * @see design.md for complete format specification
 * @see Requirements 2.2, 2.3, 3.3, 8.4
 */
export class EncryptedBlock<TID extends PlatformID = Uint8Array>
  extends EphemeralBlock<TID>
  implements IEncryptedBlock<TID>
{
  protected readonly _encryptionType: BlockEncryptionType;
  protected readonly _recipients: Array<TID>;
  protected readonly _recipientWithKey: Member<TID>;
  protected readonly _serviceProvider: ServiceProvider<TID>;
  protected readonly _idProvider: TypedIdProviderWrapper<TID>;
  protected _cachedEncryptionDetails?:
    | ISingleEncryptedParsedHeader
    | IMultiEncryptedParsedHeader<TID> = undefined;

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
    data: Uint8Array,
    checksum: Checksum,
    metadata: EncryptedBlockMetadata<TID>,
    recipientWithKey: Member<TID>,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
    this._serviceProvider = ServiceProvider.getInstance<TID>();
    this._idProvider = this._serviceProvider.idProvider;
    // Read encryption type directly from data to avoid circular dependency
    const blockEncryptionType = data[0] as BlockEncryptionType;
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
      const recipientIdBytes = data.subarray(
        UINT8_SIZE,
        UINT8_SIZE + this._idProvider.byteLength,
      );
      // Ensure we have exactly the expected bytes for the recipient ID
      if (recipientIdBytes.length !== this._idProvider.byteLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidRecipientIds,
        );
      }
      this._recipients = [this._idProvider.fromBytes(recipientIdBytes) as TID];
    } else {
      const details = this
        .encryptionDetails as IMultiEncryptedParsedHeader<TID>;
      this._recipients = details.recipientIds;
    }
    if (!recipientWithKey.hasPrivateKey) {
      throw new BlockValidationError(
        BlockValidationErrorType.EncryptionRecipientHasNoPrivateKey,
      );
    } else if (
      !this._recipients.some((r) => {
        // Convert recipient to bytes for comparison
        let rBytes: Uint8Array;
        if (typeof r === 'string') {
          rBytes = new TextEncoder().encode(r);
        } else if (r instanceof Uint8Array) {
          rBytes = r;
        } else {
          // For Guid objects, get the bytes using the idProvider
          const result = this._idProvider.toBytes(r as any);
          rBytes = result;
        }
        return arraysEqual(rBytes, recipientWithKey.idBytes);
      })
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.EncryptionRecipientNotFoundInRecipients,
      );
    }
    this._recipientWithKey = recipientWithKey;
  }

  /**
   * Create a new encrypted block from data
   */
  public static override async from<TID extends PlatformID = Uint8Array>(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Uint8Array,
    checksum: Checksum,
    creator: Member<TID>,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead?: boolean,
    canPersist?: boolean,
    recipientWithKey?: Member<TID>,
    recipientCount?: number,
  ): Promise<EncryptedBlock<TID>> {
    const encryptionType = data[0] as BlockEncryptionType;
    return new EncryptedBlock<TID>(
      type,
      dataType,
      data,
      checksum,
      new EncryptedBlockMetadata<TID>(
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
  public get recipients(): Array<TID> {
    return this._recipients;
  }

  public get recipientWithKey(): Member<TID> {
    return this._recipientWithKey;
  }

  /**
   * The encryption details parsed from the header
   */
  public get encryptionDetails():
    | ISingleEncryptedParsedHeader
    | IMultiEncryptedParsedHeader<TID> {
    if (this._cachedEncryptionDetails) {
      return this._cachedEncryptionDetails;
    }
    const encryptionType = this.encryptionType;
    if (encryptionType === BlockEncryptionType.SingleRecipient) {
      const headerData = new Uint8Array(
        this.layerHeaderData.buffer.slice(
          this.layerHeaderData.byteOffset +
            UINT8_SIZE +
            this._idProvider.byteLength,
          this.layerHeaderData.byteOffset + this.layerHeaderData.byteLength,
        ),
      );
      this._cachedEncryptionDetails =
        this._serviceProvider.eciesService.parseSingleEncryptedHeader(
          EciesEncryptionTypeEnum.WithLength,
          headerData,
        );
    } else if (encryptionType === BlockEncryptionType.MultiRecipient) {
      const headerData = new Uint8Array(
        this.layerHeaderData.buffer.slice(
          this.layerHeaderData.byteOffset + UINT8_SIZE,
          this.layerHeaderData.byteOffset + this.layerHeaderData.byteLength,
        ),
      );
      this._cachedEncryptionDetails =
        this._serviceProvider.eciesService.parseMultiEncryptedHeader(
          headerData,
        );
    } else {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    }
    if (!this._cachedEncryptionDetails) {
      throw new BlockError(BlockErrorType.UnexpectedEncryptedBlockType);
    }
    return this._cachedEncryptionDetails;
  }

  public async decrypt<D extends IEphemeralBlock<TID>>(
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

    return (this.encryptionType === BlockEncryptionType.SingleRecipient
      ? await this._serviceProvider.blockService.decrypt(
          this.recipientWithKey,
          this,
          newBlockType,
        )
      : await this._serviceProvider.blockService.decryptMultiple(
          this.recipientWithKey,
          this,
        )) as unknown as D;
  }

  /**
   * The block type stored in the header
   */
  public get blockTypeHeader(): BlockType {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this.layerHeaderData[0] as BlockType;
  }

  /**
   * The total overhead of the block, including encryption overhead.
   * For encrypted blocks, the overhead is the ECIES overhead since the
   * encryption header is part of the data buffer.
   *
   * Single-recipient uses WITH_LENGTH format (72 bytes fixed overhead):
   *   overhead = UINT8_SIZE (encryption type) + idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE
   *            = 1 + idSize + 72
   *
   * Multi-recipient uses MULTIPLE format:
   *   overhead = UINT8_SIZE (encryption type) + calculateECIESMultipleRecipientOverhead()
   *            = 1 + 74 + (recipientCount * (idSize + 60))
   *
   * @see Requirements 2.3, 3.3, 5.4
   */
  public override get layerOverheadSize(): number {
    if (this.encryptionType === BlockEncryptionType.SingleRecipient) {
      // Single-recipient: [EncType(1)][RecipientID(idSize)][ecies-lib WITH_LENGTH header(72)]
      return (
        UINT8_SIZE +
        this._idProvider.byteLength +
        ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE
      );
    } else {
      // Multi-recipient: [EncType(1)][ecies-lib MULTIPLE header]
      return (
        UINT8_SIZE +
        calculateECIESMultipleRecipientOverhead(
          (this.encryptionDetails as IMultiEncryptedParsedHeader<TID>)
            .recipientCount,
          true,
          this._idProvider.byteLength,
        )
      );
    }
  }

  /**
   * Get this layer's header data (encryption metadata)
   */
  public override get layerHeaderData(): Uint8Array {
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
  public override get layerPayload(): Uint8Array {
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
   * Get the length of the encrypted payload (excluding header and padding).
   *
   * For encrypted blocks, the payload is the actual encrypted data portion.
   * This is calculated as: total data length - header overhead
   *
   * Note: This returns the encrypted data size, not the original plaintext size.
   * Use lengthBeforeEncryption for the original data size.
   *
   * @see Requirements 2.2
   */
  public override get layerPayloadSize(): number {
    // The payload is everything after the header up to the end of encrypted data
    // For encrypted blocks, we use lengthBeforeEncryption to determine the actual
    // encrypted content size (the ciphertext is the same size as plaintext in GCM mode)
    return this.lengthBeforeEncryption;
  }

  /**
   * Get the total encrypted length including headers and payload
   */
  public get encryptedLength(): number {
    return this.layerOverheadSize + this.layerPayloadSize;
  }

  /**
   * Asynchronously validate the block's data and structure
   * @throws {ChecksumMismatchError} If validation fails due to checksum mismatch
   */
  public override async validateAsync(): Promise<void> {
    // Call parent validation first
    await super.validateAsync();

    // Validate encryption header length matches the calculated overhead
    const expectedHeaderLength = this.layerOverheadSize;
    if (this.layerHeaderData.length !== expectedHeaderLength) {
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
      if (details.iv.length !== ECIES.IV_SIZE) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidIVLength,
        );
      }
      if (details.authTag.length !== ECIES.AUTH_TAG_SIZE) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidAuthTagLength,
        );
      }
    } else if (this.encryptionType === BlockEncryptionType.MultiRecipient) {
      const details: IMultiEncryptedParsedHeader<TID> = this
        .encryptionDetails as IMultiEncryptedParsedHeader<TID>;

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
          .map((id) => this._idProvider.toBytes(id))
          .some((id) => id.length !== id.byteLength)
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
      this._serviceProvider.blockCapacityCalculator.calculateCapacity({
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

    // Validate encrypted length
    if (this.encryptedLength > this.blockSize) {
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

    // Validate encryption header length matches the calculated overhead
    const expectedHeaderLength = this.layerOverheadSize;
    if (this.layerHeaderData.length !== expectedHeaderLength) {
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
      if (details.iv.length !== ECIES.IV_SIZE) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidIVLength,
        );
      }
      if (details.authTag.length !== ECIES.AUTH_TAG_SIZE) {
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
      this._serviceProvider.blockCapacityCalculator.calculateCapacity({
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

    // Validate encrypted length
    if (this.encryptedLength > this.blockSize) {
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
