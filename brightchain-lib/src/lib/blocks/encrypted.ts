import { BrightChainMember } from '../brightChainMember';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
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
export class EncryptedBlock extends EphemeralBlock implements IEncryptedBlock {
  /**
   * Creates an instance of EncryptedBlock.
   * @param type - The type of the block
   * @param blockSize - The size of the block
   * @param data - The encrypted data
   * @param checksum - The checksum of the data
   * @param creator - The creator of the block
   * @param dateCreated - The date the block was created
   * @param actualDataLength - The length of the data before encryption, if known
   * @param canRead - Whether the block can be read
   * @param canPersist - Whether the block can be persisted
   */
  constructor(
    type: BlockType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ) {
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

    // Calculate checksum from entire data buffer if not provided
    const finalChecksum =
      checksum ?? StaticHelpersChecksum.calculateChecksum(data);

    // Validate checksum before calling super
    if (checksum) {
      const computedChecksum = StaticHelpersChecksum.calculateChecksum(data);
      if (!computedChecksum.equals(checksum)) {
        throw new Error('Checksum mismatch');
      }
    }

    super(
      type,
      BlockDataType.EncryptedData,
      blockSize,
      data,
      finalChecksum,
      creator,
      dateCreated,
      actualDataLength ?? data.length - StaticHelpersECIES.eciesOverheadLength, // Use unencrypted length
      canRead,
      true, // Set encrypted flag to true since this is an encrypted block
      canPersist,
    );
  }

  /**
   * The length of the encrypted data is the actual data length plus the overhead of the encryption
   */
  public get encryptedLength(): number {
    if (this.actualDataLength === undefined) {
      throw new Error('Actual data length is unknown');
    }

    // The encrypted length is the length of the data buffer, which includes both
    // the encryption header and the encrypted payload
    return this.data.length;
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
}
