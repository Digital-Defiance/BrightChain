import { BrightChainMember } from '../brightChainMember';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';
import { EphemeralBlock } from './ephemeral';

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
export abstract class EncryptedBlock
  extends EphemeralBlock
  implements IEncryptedBlock
{
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    encrypted = true,
    canPersist = true,
  ): Promise<EncryptedBlock> {
    // Validate data length
    if (data.length < StaticHelpersECIES.eciesOverheadLength) {
      throw new Error('Data too short to contain encryption header');
    }

    // Total data length must not exceed block size
    if (data.length > (blockSize as number)) {
      throw new Error('Data length exceeds block capacity');
    }

    // For encrypted blocks with known actual data length:
    // 1. The actual data length must not exceed available capacity
    // 2. The total encrypted length must not exceed block size
    if (actualDataLength !== undefined) {
      const availableCapacity =
        (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
      if (actualDataLength > availableCapacity) {
        throw new Error('Data length exceeds block capacity');
      }
    }

    // Calculate and validate checksum
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    const metadata: EphemeralBlockMetadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      actualDataLength ?? data.length - StaticHelpersECIES.eciesOverheadLength,
      false,
      creator,
      dateCreated,
    );

    if (type === BlockType.EncryptedConstituentBlockListBlock) {
      return new EncryptedConstituentBlockListBlock(
        BlockType.EncryptedConstituentBlockListBlock,
        BlockDataType.EncryptedData,
        data,
        finalChecksum,
        EncryptedBlockMetadata.fromEphemeralBlockMetadata(metadata),
        canRead,
        canPersist,
      );
    } else if (type === BlockType.EncryptedOwnedDataBlock) {
      return new EncryptedOwnedDataBlock(
        BlockType.EncryptedOwnedDataBlock,
        BlockDataType.EncryptedData,
        data,
        finalChecksum,
        EncryptedBlockMetadata.fromEphemeralBlockMetadata(metadata),
        canRead,
        canPersist,
      );
    } else {
      throw new Error(`Invalid block type ${type}`);
    }
  }

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
  protected constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Buffer,
    checksum: ChecksumBuffer,
    metadata: EphemeralBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(type, dataType, data, checksum, metadata, canRead, canPersist);
  }

  public get encryptedLength(): number {
    return this.actualDataLength + StaticHelpersECIES.eciesOverheadLength;
  }

  /**
   * The ephemeral public key used to encrypt the data
   */
  public get ephemeralPublicKey(): Buffer {
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
  public get iv(): Buffer {
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
  public get authTag(): Buffer {
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
    return this.data.subarray(
      StaticHelpersECIES.eciesOverheadLength,
      StaticHelpersECIES.eciesOverheadLength + this.actualDataLength,
    );
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
}
