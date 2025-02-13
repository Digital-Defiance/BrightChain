import { BlockChecksum } from '../access/checksum';
import { BrightChainMember } from '../brightChainMember';
import { ECIES } from '../constants';
import { EmailString } from '../emailString';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import {
  BlockSize,
  lengthToClosestBlockSize,
} from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { MemberType } from '../enumerations/memberType';
import { MultiEncryptedErrorType } from '../enumerations/multiEncryptedErrorType';
import { MultiEncryptedError } from '../errors/multiEncryptedError';
import { GuidV4 } from '../guid';
import { IMultiEncryptedBlock } from '../interfaces/multiEncryptedBlock';
import { ECIESService } from '../services/ecies.service';
import { ServiceProvider } from '../services/service.provider';
import { VotingService } from '../services/voting.service';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

/**
 * Base class for encrypted blocks.
 * Adds encryption-specific header data and overhead calculations.
 *
 * Block Structure:
 * [Layer 0 Header][Layer 1 Header][...][Encryption Header][Encrypted Payload][Padding]
 *
 * Encryption Header:
 * [Ephemeral Public Key (65 bytes)][IV (16 bytes)][Auth Tag (16 bytes)]
 */
export class MultiEncryptedBlock
  extends EncryptedBlock
  implements IMultiEncryptedBlock
{
  protected _recipients: BrightChainMember[];
  protected _encryptedKeys: Buffer[];
  protected _encryptedMessageData: Buffer; // Renamed to match interface

  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead = true,
    canPersist = true,
  ): Promise<MultiEncryptedBlock> {
    const eciesService = ServiceProvider.getECIESService();

    if (data.length < eciesService.eciesOverheadLength) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.DataTooShort);
    }

    // For encrypted blocks, we need to validate both:
    // 1. The total data length (including encryption header) against block size
    // 2. The actual data length against available capacity
    if (lengthBeforeEncryption !== undefined) {
      const availableCapacity =
        (blockSize as number) - eciesService.eciesOverheadLength;
      if (lengthBeforeEncryption > availableCapacity) {
        throw new MultiEncryptedError(
          MultiEncryptedErrorType.DataLengthExceedsCapacity,
        );
      }
      // Total encrypted length will be actualDataLength + overhead
      const totalLength =
        lengthBeforeEncryption + eciesService.eciesOverheadLength;
      if (totalLength > (blockSize as number)) {
        throw new MultiEncryptedError(
          MultiEncryptedErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // Calculate checksum if not provided
    const finalChecksum = checksum ?? BlockChecksum.calculateChecksum(data);

    // Create a padded buffer with zeros
    const paddedData = Buffer.alloc(blockSize);
    data.copy(paddedData, 0);

    // Parse the encrypted data to get recipients and keys
    const blockMetadata =
      eciesService.bufferToMultiRecipientEncryption(paddedData);
    const recipients = await Promise.all(
      blockMetadata.recipientIds.map(async (id: GuidV4) => {
        return new BrightChainMember(
          MemberType.User,
          `Member ${id.toString()}`,
          new EmailString('unknown@example.com'),
          Buffer.alloc(ECIES.PUBLIC_KEY_LENGTH),
          await VotingService.generateVotingKeyPair().publicKey,
          undefined,
          undefined,
          id,
        );
      }),
    );

    const metadata = new EncryptedBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      lengthBeforeEncryption ?? data.length - eciesService.eciesOverheadLength,
      creator,
      dateCreated ?? new Date(),
    );

    // Create and return the block
    return new MultiEncryptedBlock(
      type,
      dataType,
      paddedData,
      finalChecksum,
      metadata,
      eciesService,
      canRead,
      canPersist,
      recipients,
      blockMetadata.encryptedKeys,
      blockMetadata.encryptedMessage,
    );
  }

  public static async newFromData(
    data: Buffer,
    creator?: BrightChainMember | GuidV4,
  ): Promise<MultiEncryptedBlock> {
    const blockSize = lengthToClosestBlockSize(data.length);
    const checksum = BlockChecksum.calculateChecksum(data);

    return MultiEncryptedBlock.from(
      BlockType.MultiEncryptedBlock,
      BlockDataType.EncryptedData,
      blockSize,
      data,
      checksum,
      creator,
      undefined,
      data.length,
      true,
      true,
    );
  }

  /**
   * Creates an instance of MultiEncryptedBlock.
   * @param type - The type of the block
   * @param dataType - The type of data in the block
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param dateCreated - The date the block was created
   * @param metadata - The block metadata
   * @param eciesService - The ECIES service to use for encryption/decryption
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   * @param recipients - The recipients who can decrypt this block
   * @param encryptedKeys - The encrypted keys for each recipient
   * @param encryptedData - The encrypted data
   */
  public constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EncryptedBlockMetadata,
    eciesService: ECIESService,
    canRead = true,
    canPersist = true,
    recipients: BrightChainMember[] = [],
    encryptedKeys: Buffer[] = [],
    encryptedMessage: Buffer = Buffer.alloc(0),
  ) {
    // Use the input data directly since it should already be properly formatted
    // with header and encrypted message
    const combinedData = data;

    super(
      type,
      dataType,
      combinedData,
      checksum,
      metadata,
      eciesService,
      canRead,
      canPersist,
    );

    this._recipients = recipients;
    this._encryptedKeys = encryptedKeys;
    this._encryptedMessageData = encryptedMessage;
  }

  /**
   * The recipients who can decrypt this block
   */
  public get recipients(): BrightChainMember[] {
    return this._recipients;
  }

  /**
   * The encrypted keys for each recipient
   */
  public get encryptedKeys(): Buffer[] {
    return this._encryptedKeys;
  }

  /**
   * The creator of the block
   */
  public override get creator(): BrightChainMember {
    const creator = super.creator;
    if (!(creator instanceof BrightChainMember)) {
      throw new MultiEncryptedError(
        MultiEncryptedErrorType.CreatorMustBeMember,
      );
    }
    return creator;
  }

  /**
   * The encrypted data
   */
  public get encryptedData(): Buffer {
    return this._encryptedMessageData; // Use renamed property
  }

  /**
   * The ephemeral public key used to encrypt the data
   */
  public override get ephemeralPublicKey(): Buffer {
    if (!this.canRead) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.BlockNotReadable);
    }
    // Get the ephemeral public key (already includes 0x04 prefix)
    const key = this.layerHeaderData.subarray(
      0,
      this.eciesService.publicKeyLength,
    );
    if (key.length !== this.eciesService.publicKeyLength) {
      throw new MultiEncryptedError(
        MultiEncryptedErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    return key;
  }

  /**
   * The initialization vector used to encrypt the data
   */
  public override get iv(): Buffer {
    if (!this.canRead) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.BlockNotReadable);
    }
    const iv = this.layerHeaderData.subarray(
      this.eciesService.publicKeyLength,
      this.eciesService.publicKeyLength + this.eciesService.ivLength,
    );
    if (iv.length !== this.eciesService.ivLength) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.InvalidIVLength);
    }
    return iv;
  }

  /**
   * The authentication tag used to encrypt the data
   */
  public override get authTag(): Buffer {
    if (!this.canRead) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.BlockNotReadable);
    }
    // The auth tag is after the ephemeral public key (with 0x04 prefix) and IV
    const start =
      this.eciesService.publicKeyLength + this.eciesService.ivLength;
    const end = start + this.eciesService.authTagLength;

    const tag = this.layerHeaderData.subarray(start, end);
    if (tag.length !== this.eciesService.authTagLength) {
      throw new MultiEncryptedError(
        MultiEncryptedErrorType.InvalidAuthTagLength,
      );
    }
    return tag;
  }

  /**
   * The total overhead of the block, including encryption overhead
   * For encrypted blocks, the overhead is just the ECIES overhead since the
   * encryption header is part of the data buffer
   */
  public override get totalOverhead(): number {
    return this.eciesService.eciesOverheadLength;
  }

  /**
   * Get this layer's header data (encryption metadata)
   */
  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.BlockNotReadable);
    }
    // For encrypted blocks, the header is always at the start of the data
    // since EphemeralBlock has no header data
    return this.data.subarray(0, this.eciesService.eciesOverheadLength);
  }

  /**
   * Get the encrypted payload data (excluding the encryption header)
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.BlockNotReadable);
    }
    // For encrypted blocks:
    // 1. Skip the encryption header (ephemeral public key + IV + auth tag)
    // 2. Return the entire encrypted data (including padding)
    // 3. Ensure we return exactly blockSize - overhead bytes
    return this.data.subarray(this.eciesService.eciesOverheadLength);
  }

  /**
   * Get the length of the payload
   */
  public override get payloadLength(): number {
    // For encrypted blocks:
    // The payload length should be the length of the encrypted data
    // without the encryption header
    return this.encryptedLength;
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    // For encrypted blocks, we need to:
    // 1. Start with the full block size
    // 2. Subtract the ECIES overhead
    // This ensures proper capacity calculation for encrypted blocks
    return this.blockSize - this.eciesService.eciesOverheadLength;
  }

  /**
   * Validate the block's checksum
   */
  public override async validateAsync(): Promise<void> {
    // For encrypted blocks, we need to validate the checksum of the entire data
    // since the encryption process includes padding
    const calculatedChecksum = BlockChecksum.calculateChecksum(this.data);

    if (!calculatedChecksum.equals(this.idChecksum)) {
      throw new MultiEncryptedError(MultiEncryptedErrorType.ChecksumMismatch);
    }
  }
}
