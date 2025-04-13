import { ECIESService, PlatformID } from '@digitaldefiance/ecies-lib';
import { CBL, CONSTANTS, ECIES, ENCRYPTION } from '../constants';
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { validateBlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockCapacityError } from '../errors/block/blockCapacity';
import {
  IBlockCapacityParams,
  IBlockCapacityResult,
  IOverheadBreakdown,
} from '../interfaces/blockCapacity';
import { CBLService } from '../services/cblService';

/**
 * Service for calculating block capacities based on block type and parameters
 */
export class BlockCapacityCalculator<TID extends PlatformID = Uint8Array> {
  constructor(
    private readonly cblService: CBLService<TID>,
    private readonly eciesService: ECIESService<TID>,
  ) {}

  /**
   * Calculate the capacity for a block with the given parameters
   */
  public calculateCapacity(params: IBlockCapacityParams): IBlockCapacityResult {
    // Validate block size
    if (!validateBlockSize(params.blockSize)) {
      throw new BlockCapacityError(BlockCapacityErrorType.InvalidBlockSize);
    }

    // Validate block type
    if (!this.isValidBlockType(params.blockType)) {
      throw new BlockCapacityError(BlockCapacityErrorType.InvalidBlockType);
    }

    // Initialize overhead breakdown
    const details: IOverheadBreakdown = {
      baseHeader: 0,
      typeSpecificOverhead: 0,
      encryptionOverhead: 0,
      variableOverhead: 0,
    };

    let alignCapacityToTuple = false;

    if (
      [
        BlockType.ConstituentBlockList,
        BlockType.EncryptedConstituentBlockListBlock,
      ].includes(params.blockType)
    ) {
      // Use dynamic base header size instead of static constant
      const baseHeaderSize = this.calculateCBLBaseHeaderSize();
      details.typeSpecificOverhead += baseHeaderSize + ECIES.SIGNATURE_LENGTH;
      alignCapacityToTuple = true;
    } else if (
      [
        BlockType.ExtendedConstituentBlockListBlock,
        BlockType.EncryptedExtendedConstituentBlockListBlock,
      ].includes(params.blockType)
    ) {
      if (!params.cbl) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidExtendedCblData,
        );
      }
      // Validate filename and mimetype
      this.cblService.validateFileNameFormat(params.cbl.fileName);
      this.cblService.validateMimeTypeFormat(params.cbl.mimeType);

      // Use dynamic base header size instead of static constant
      const baseHeaderSize = this.calculateCBLBaseHeaderSize();
      details.typeSpecificOverhead += baseHeaderSize + ECIES.SIGNATURE_LENGTH;
      details.variableOverhead += this.calculateExtendedCBLOverhead(
        params.cbl.fileName,
        params.cbl.mimeType,
      );
      alignCapacityToTuple = true;
    } else if (params.blockType === BlockType.MultiEncryptedBlock) {
      // Handle multi-encrypted blocks
      if (
        params.encryptionType === BlockEncryptionType.MultiRecipient &&
        (!params.recipientCount || params.recipientCount < 1)
      ) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidRecipientCount,
        );
      } else if (
        params.encryptionType === BlockEncryptionType.MultiRecipient &&
        params.recipientCount &&
        params.recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS
      ) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidRecipientCount,
        );
      }

      if (
        params.encryptionType === BlockEncryptionType.MultiRecipient &&
        params.recipientCount
      ) {
        details.encryptionOverhead =
          this.eciesService.calculateECIESMultipleRecipientOverhead(
            params.recipientCount,
            true,
          );
      }
    }

    if (
      [
        BlockType.EncryptedConstituentBlockListBlock,
        BlockType.EncryptedExtendedConstituentBlockListBlock,
        BlockType.EncryptedOwnedDataBlock,
      ].includes(params.blockType)
    ) {
      if (
        params.encryptionType === BlockEncryptionType.MultiRecipient &&
        (!params.recipientCount || params.recipientCount < 1)
      ) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidRecipientCount,
        );
      } else if (
        params.encryptionType === BlockEncryptionType.MultiRecipient &&
        params.recipientCount &&
        params.recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS
      ) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidRecipientCount,
        );
      }
      details.typeSpecificOverhead += ENCRYPTION.ENCRYPTION_TYPE_SIZE;
      details.encryptionOverhead =
        params.encryptionType === BlockEncryptionType.MultiRecipient
          ? this.eciesService.calculateECIESMultipleRecipientOverhead(
              params.recipientCount ?? 0,
              true,
            ) - ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE
          : ECIES.OVERHEAD_SIZE + ENCRYPTION.RECIPIENT_ID_SIZE;
    }

    // Calculate total overhead and available capacity
    const totalOverhead =
      details.baseHeader +
      details.encryptionOverhead +
      details.typeSpecificOverhead +
      details.variableOverhead;

    const totalCapacity = params.blockSize as number;
    let availableCapacity = totalCapacity - totalOverhead;

    if (alignCapacityToTuple) {
      // Ensure capacity is aligned to tuple size
      availableCapacity =
        Math.floor(availableCapacity / CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH) *
        CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH;
    }

    if (availableCapacity < 0) {
      throw new BlockCapacityError(BlockCapacityErrorType.CapacityExceeded);
    }

    return {
      totalCapacity,
      availableCapacity,
      overhead: totalOverhead,
      details,
    };
  }

  /**
   * Validate that the block type is a valid enum value
   */
  private isValidBlockType(blockType: BlockType): boolean {
    return Object.values(BlockType).includes(blockType);
  }

  /**
   * Calculate the base CBL header size dynamically based on the provider
   */
  private calculateCBLBaseHeaderSize(): number {
    // Base CBL header includes:
    // - Creator ID (dynamic length)
    // - Date created (8 bytes)
    // - Address count (4 bytes)
    // - Tuple size (1 byte)
    // - Original data length (8 bytes)
    // - Original data checksum (64 bytes)
    // - Is extended header flag (1 byte)
    // Note: Signature is added separately
    return (
      this.cblService.creatorLength +
      CONSTANTS['UINT32_SIZE'] * 2 + // Date (high/low)
      CONSTANTS['UINT32_SIZE'] + // Address count
      CONSTANTS['UINT8_SIZE'] + // Tuple size
      CONSTANTS['UINT64_SIZE'] + // Original data length
      CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH + // Original data checksum
      CONSTANTS['UINT8_SIZE'] // Is extended header flag
    );
  }

  /**
   * Calculate extended CBL overhead based on filename and mimetype
   */
  private calculateExtendedCBLOverhead(
    filename: string,
    mimetype: string,
  ): number {
    // Extended CBL overhead includes:
    // 1. Base CBL overhead (already accounted for in typeSpecificHeader)
    // 2. Extended header overhead:
    //    - 2 bytes for filename length
    //    - Actual filename bytes
    //    - 1 byte for mimetype length
    //    - Actual mimetype bytes
    //    - Additional signature space for extended data
    const extendedHeaderSize =
      CONSTANTS['UINT16_SIZE'] + // Filename length (2 bytes)
      filename.length + // Actual filename
      CONSTANTS['UINT8_SIZE'] + // Mimetype length (1 byte)
      mimetype.length; // Actual mimetype

    return extendedHeaderSize;
  }
}
