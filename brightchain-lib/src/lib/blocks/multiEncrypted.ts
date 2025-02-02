import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import {
  BlockSize,
  lengthToClosestBlockSize,
} from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { MemberType } from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { IMultiEncryptedBlock } from '../interfaces/multiEncryptedBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { StaticHelpersVoting } from '../staticHelpers.voting';
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
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ): Promise<MultiEncryptedBlock> {
    if (data.length < StaticHelpersECIES.eciesOverheadLength) {
      throw new Error('Data too short to contain encryption header');
    }

    // For encrypted blocks, we need to validate both:
    // 1. The total data length (including encryption header) against block size
    // 2. The actual data length against available capacity
    if (actualDataLength !== undefined) {
      const availableCapacity =
        (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
      if (actualDataLength > availableCapacity) {
        throw new Error('Data length exceeds block capacity');
      }
      // Total encrypted length will be actualDataLength + overhead
      const totalLength =
        actualDataLength + StaticHelpersECIES.eciesOverheadLength;
      if (totalLength > (blockSize as number)) {
        throw new Error('Data length exceeds block capacity');
      }
    }

    // Calculate checksum if not provided
    const finalChecksum =
      checksum ?? (await StaticHelpersChecksum.calculateChecksumAsync(data));

    // Parse the encrypted data to get recipients and keys
    const blockMetadata =
      StaticHelpersECIES.bufferToMultiRecipientEncryption(data);
    const recipients = await Promise.all(
      blockMetadata.recipientIds.map(async (id) => {
        return new BrightChainMember(
          MemberType.User,
          `Member ${id.toString()}`,
          new EmailString('unknown@example.com'),
          Buffer.alloc(65),
          await StaticHelpersVoting.generateVotingKeyPair().publicKey,
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
      actualDataLength ?? data.length - StaticHelpersECIES.eciesOverheadLength,
      creator,
      dateCreated ?? new Date(),
    );

    // Create a padded buffer with zeros
    const paddedData = Buffer.alloc(blockSize);
    data.copy(paddedData, 0);

    // Create and return the block with padded data
    return new MultiEncryptedBlock(
      type,
      dataType,
      paddedData,
      finalChecksum,
      metadata,
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
    const checksum = await StaticHelpersChecksum.calculateChecksumAsync(data);

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
      throw new Error('Creator must be a BrightChainMember');
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
      throw new Error('Block cannot be read');
    }
    // Get the ephemeral public key (already includes 0x04 prefix)
    const key = this.layerHeaderData.subarray(
      0,
      StaticHelpersECIES.publicKeyLength,
    );
    if (key.length !== StaticHelpersECIES.publicKeyLength) {
      throw new Error('Invalid ephemeral public key length');
    }
    return key;
  }

  /**
   * The initialization vector used to encrypt the data
   */
  public override get iv(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const iv = this.layerHeaderData.subarray(
      StaticHelpersECIES.publicKeyLength,
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
    );
    if (iv.length !== StaticHelpersECIES.ivLength) {
      throw new Error('Invalid IV length');
    }
    return iv;
  }

  /**
   * The authentication tag used to encrypt the data
   */
  public override get authTag(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // The auth tag is after the ephemeral public key (with 0x04 prefix) and IV
    const start =
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength;
    const end = start + StaticHelpersECIES.authTagLength;

    const tag = this.layerHeaderData.subarray(start, end);
    if (tag.length !== StaticHelpersECIES.authTagLength) {
      throw new Error('Invalid auth tag length');
    }
    return tag;
  }

  /**
   * The total overhead of the block, including encryption overhead
   * For encrypted blocks, the overhead is just the ECIES overhead since the
   * encryption header is part of the data buffer
   */
  public override get totalOverhead(): number {
    return StaticHelpersECIES.eciesOverheadLength;
  }

  /**
   * Get this layer's header data (encryption metadata)
   */
  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // For encrypted blocks, the header is always at the start of the data
    // since EphemeralBlock has no header data
    return this.data.subarray(0, StaticHelpersECIES.eciesOverheadLength);
  }

  /**
   * Get the encrypted payload data (excluding the encryption header)
   */
  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    // For encrypted blocks:
    // 1. Skip the encryption header (ephemeral public key + IV + auth tag)
    // 2. Return the entire encrypted data (including padding)
    // 3. Ensure we return exactly blockSize - overhead bytes
    return this.data.subarray(StaticHelpersECIES.eciesOverheadLength);
  }

  /**
   * Get the length of the payload
   */
  public override get payloadLength(): number {
    // For encrypted blocks:
    // The payload length should be the length of the encrypted data
    // without the encryption header
    return this.data.length - StaticHelpersECIES.eciesOverheadLength;
  }

  /**
   * Get the usable capacity after accounting for overhead
   */
  public override get capacity(): number {
    // For encrypted blocks, we need to:
    // 1. Start with the full block size
    // 2. Subtract the ECIES overhead
    // This ensures proper capacity calculation for encrypted blocks
    return this.blockSize - StaticHelpersECIES.eciesOverheadLength;
  }

  /**
   * Validate the block's checksum
   */
  public override async validateAsync(): Promise<void> {
    // For encrypted blocks, we need to validate the checksum of the entire data
    // since the encryption process includes padding
    const calculatedChecksum =
      await StaticHelpersChecksum.calculateChecksumAsync(this.data);

    if (!calculatedChecksum.equals(this.idChecksum)) {
      throw new Error('Checksum mismatch');
    }
  }
}
