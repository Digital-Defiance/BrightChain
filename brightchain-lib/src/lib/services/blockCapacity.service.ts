import { ECIES, ECIESService, PlatformID } from '@digitaldefiance/ecies-lib';
import CONSTANTS from '../constants';
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockType } from '../enumerations/blockType';
import { BlockCapacityError } from '../errors/block/blockCapacity';
import { ExtendedCblError } from '../errors/extendedCblError';
import {
  IBlockCapacityParams,
  IBlockCapacityResult,
  IOverheadBreakdown,
} from '../interfaces/blockCapacity';
import { CBLService } from '../services/cblService';
import { Validator } from '../utils/validator';

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
   *
   * @param params - The block capacity parameters
   * @returns The calculated block capacity result
   * @throws {EnhancedValidationError} If block size, block type, or encryption type is invalid
   * @throws {BlockCapacityError} If capacity calculation fails or CBL data is invalid
   *
   * @see Requirements 5.1, 5.2, 5.3, 5.5, 6.1, 6.2, 6.5, 7.2, 7.3, 12.3, 12.4, 12.5, 12.6
   */
  public calculateCapacity(params: IBlockCapacityParams): IBlockCapacityResult {
    // Validate all inputs using Validator class
    Validator.validateBlockSize(params.blockSize, 'calculateCapacity');
    Validator.validateBlockType(params.blockType, 'calculateCapacity');
    Validator.validateEncryptionType(
      params.encryptionType,
      'calculateCapacity',
    );

    // Initialize overhead breakdown
    const details: IOverheadBreakdown = {
      baseHeader: 0,
      typeSpecificOverhead: 0,
      encryptionOverhead: 0,
      variableOverhead: 0,
    };

    let alignCapacityToTuple = false;

    // Use exhaustive switch for block type handling
    const blockTypeOverhead = this.calculateBlockTypeOverhead(
      params.blockType,
      params,
      details,
    );
    alignCapacityToTuple = blockTypeOverhead.alignCapacityToTuple;

    // Handle encryption overhead for encrypted block types
    this.calculateEncryptionOverhead(params, details);

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
        Math.floor(
          availableCapacity / CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH,
        ) * CONSTANTS['CHECKSUM'].SHA3_BUFFER_LENGTH;
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
   * Calculate overhead for a specific block type using exhaustive switch.
   *
   * @param blockType - The block type to calculate overhead for
   * @param params - The block capacity parameters
   * @param details - The overhead breakdown to update
   * @returns Object indicating whether capacity should be aligned to tuple size
   * @throws {BlockCapacityError} If block type requires CBL data but none provided
   *
   * @see Requirements 6.1, 6.2, 6.5
   */
  private calculateBlockTypeOverhead(
    blockType: BlockType,
    params: IBlockCapacityParams,
    details: IOverheadBreakdown,
  ): { alignCapacityToTuple: boolean } {
    switch (blockType) {
      case BlockType.RawData:
      case BlockType.Random:
      case BlockType.FECData:
      case BlockType.EphemeralOwnedDataBlock:
      case BlockType.Handle:
      case BlockType.Unknown:
        // These block types have no type-specific overhead
        return { alignCapacityToTuple: false };

      case BlockType.OwnerFreeWhitenedBlock:
        // Whitened blocks have no additional overhead
        return { alignCapacityToTuple: false };

      case BlockType.ConstituentBlockList:
      case BlockType.EncryptedConstituentBlockListBlock: {
        // Use dynamic base header size instead of static constant
        const baseHeaderSize = this.calculateCBLBaseHeaderSize();
        details.typeSpecificOverhead += baseHeaderSize + ECIES.SIGNATURE_SIZE;
        return { alignCapacityToTuple: true };
      }

      case BlockType.ExtendedConstituentBlockListBlock:
      case BlockType.EncryptedExtendedConstituentBlockListBlock: {
        if (!params.cbl) {
          throw new BlockCapacityError(
            BlockCapacityErrorType.InvalidExtendedCblData,
          );
        }
        // Validate filename and mimetype, wrapping CBL service errors
        this.validateCBLData(params.cbl);

        // Use dynamic base header size instead of static constant
        const baseHeaderSize = this.calculateCBLBaseHeaderSize();
        details.typeSpecificOverhead += baseHeaderSize + ECIES.SIGNATURE_SIZE;
        details.variableOverhead += this.calculateExtendedCBLOverhead(
          params.cbl.fileName,
          params.cbl.mimeType,
        );
        return { alignCapacityToTuple: true };
      }

      case BlockType.EncryptedOwnedDataBlock:
        details.typeSpecificOverhead += ECIES.ENCRYPTION_TYPE_SIZE;
        return { alignCapacityToTuple: false };

      case BlockType.MultiEncryptedBlock:
        // Overhead calculated separately for encryption
        return { alignCapacityToTuple: false };

      default: {
        // TypeScript exhaustive check - this should never be reached
        // if all BlockType enum values are handled above
        const exhaustiveCheck: never = blockType;
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidBlockType,
          undefined,
          { blockType: exhaustiveCheck },
        );
      }
    }
  }

  /**
   * Calculate encryption overhead based on encryption type and block type.
   *
   * @param params - The block capacity parameters
   * @param details - The overhead breakdown to update
   * @throws {BlockCapacityError} If recipient count is invalid for multi-recipient encryption
   *
   * @see Requirements 5.3, 12.5, 12.6
   */
  private calculateEncryptionOverhead(
    params: IBlockCapacityParams,
    details: IOverheadBreakdown,
  ): void {
    // Handle multi-encrypted blocks
    if (params.blockType === BlockType.MultiEncryptedBlock) {
      if (params.encryptionType === BlockEncryptionType.MultiRecipient) {
        // Validate recipient count using Validator
        Validator.validateRecipientCount(
          params.recipientCount,
          params.encryptionType,
          'calculateCapacity',
        );

        if (params.recipientCount) {
          details.encryptionOverhead =
            this.eciesService.calculateECIESMultipleRecipientOverhead(
              params.recipientCount,
              true,
            );
        }
      }
      return;
    }

    // Handle encrypted block types
    const encryptedBlockTypes = [
      BlockType.EncryptedConstituentBlockListBlock,
      BlockType.EncryptedExtendedConstituentBlockListBlock,
      BlockType.EncryptedOwnedDataBlock,
    ];

    if (encryptedBlockTypes.includes(params.blockType)) {
      // Validate recipient count for multi-recipient encryption
      if (params.encryptionType === BlockEncryptionType.MultiRecipient) {
        Validator.validateRecipientCount(
          params.recipientCount,
          params.encryptionType,
          'calculateCapacity',
        );
      }

      // Add encryption type byte to type-specific overhead
      details.typeSpecificOverhead += ECIES.ENCRYPTION_TYPE_SIZE;

      if (params.encryptionType === BlockEncryptionType.MultiRecipient) {
        // Multi-recipient encryption uses ECIES MULTIPLE format
        // Overhead includes: header + per-recipient entries
        details.encryptionOverhead =
          this.eciesService.calculateECIESMultipleRecipientOverhead(
            params.recipientCount ?? 0,
            true,
          ) - ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE;
      } else {
        // Single-recipient encryption uses ECIES WITH_LENGTH format
        // Overhead = recipient ID (idProvider.byteLength) + ECIES WITH_LENGTH overhead (72 bytes)
        const idSize = this.eciesService.idProvider.byteLength;
        details.encryptionOverhead =
          idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      }
    }
  }

  /**
   * Validate CBL data (wraps cblService calls with error context).
   *
   * @param cbl - The CBL data containing fileName and mimeType
   * @throws {BlockCapacityError} If CBL validation fails
   *
   * @see Requirements 7.2, 7.3, 12.7
   */
  private validateCBLData(cbl: { fileName: string; mimeType: string }): void {
    try {
      this.cblService.validateFileNameFormat(cbl.fileName);
      this.cblService.validateMimeTypeFormat(cbl.mimeType);
    } catch (error) {
      // Wrap ExtendedCblError in BlockCapacityError with context
      if (error instanceof ExtendedCblError) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidExtendedCblData,
          undefined,
          {
            originalErrorType: error.type.toString(),
            fileName: cbl.fileName,
            mimeType: cbl.mimeType,
          },
        );
      }
      // Re-throw other errors
      throw error;
    }
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
    // 1. Base CBL overhead (already accounted for in typeSpecificOverhead)
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
