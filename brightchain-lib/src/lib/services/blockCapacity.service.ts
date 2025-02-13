import { CBL, CONSTANTS, ECIES } from '../constants';
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { validateBlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockCapacityError } from '../errors/blockCapacityError';
import {
  IBlockCapacityParams,
  IBlockCapacityResult,
  IOverheadBreakdown,
} from '../interfaces/blockCapacity';
import { CBLService } from '../services/cblService';
import { ECIESService } from '../services/ecies.service';

/**
 * Service for calculating block capacities based on block type and parameters
 */
export class BlockCapacityCalculator {
  constructor(
    private readonly cblService: CBLService,
    private readonly eciesService: ECIESService,
  ) {}

  /**
   * Calculate the capacity for a block with the given parameters
   */
  public calculateCapacity(params: IBlockCapacityParams): IBlockCapacityResult {
    // Validate block size
    if (!validateBlockSize(params.blockSize)) {
      throw new BlockCapacityError(BlockCapacityErrorType.InvalidBlockSize);
    }

    // Initialize overhead breakdown
    const details: IOverheadBreakdown = {
      baseHeader: 0,
      typeSpecificHeader: 0,
      encryptionOverhead: params.usesStandardEncryption
        ? ECIES.OVERHEAD_SIZE
        : 0,
      variableOverhead: 0,
    };

    let alignCapacityToTuple = false;

    // Calculate type-specific overhead
    switch (params.blockType) {
      case BlockType.ConstituentBlockList:
        details.typeSpecificHeader = CBL.BASE_OVERHEAD + ECIES.SIGNATURE_LENGTH;
        alignCapacityToTuple = true;
        break;

      case BlockType.ExtendedConstituentBlockListBlock:
        if (!params.filename) {
          throw new BlockCapacityError(BlockCapacityErrorType.InvalidFileName);
        } else if (!params.mimetype) {
          throw new BlockCapacityError(BlockCapacityErrorType.InvalidMimeType);
        }
        // Validate filename and mimetype
        this.cblService.validateFileNameFormat(params.filename);
        this.cblService.validateMimeTypeFormat(params.mimetype);

        // For extended CBL, we need additional overhead beyond the base CBL overhead
        details.typeSpecificHeader = CBL.BASE_OVERHEAD + ECIES.SIGNATURE_LENGTH;
        details.variableOverhead = this.calculateExtendedCBLOverhead(
          params.filename,
          params.mimetype,
        );
        alignCapacityToTuple = true;
        break;

      case BlockType.MultiEncryptedBlock:
        if (!params.recipientCount || params.recipientCount < 1) {
          throw new BlockCapacityError(
            BlockCapacityErrorType.InvalidRecipientCount,
          );
        }
        if (params.recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
          throw new BlockCapacityError(
            BlockCapacityErrorType.InvalidRecipientCount,
          );
        }
        details.typeSpecificHeader = ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE;
        details.variableOverhead =
          this.eciesService.calculateECIESMultipleRecipientOverhead(
            params.recipientCount,
          ) - ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE;
        break;

      case BlockType.RawData:
      case BlockType.Random:
      case BlockType.EphemeralOwnedDataBlock:
      case BlockType.OwnerFreeWhitenedBlock:
      case BlockType.FECData:
      case BlockType.EncryptedOwnedDataBlock:
      case BlockType.EncryptedConstituentBlockListBlock:
      case BlockType.EncryptedExtendedConstituentBlockListBlock:
      case BlockType.Handle:
        // These types only have base overhead
        break;

      default:
        // Throw an error for invalid block types
        throw new BlockCapacityError(BlockCapacityErrorType.InvalidBlockType);
    }

    // Calculate total overhead and available capacity
    const totalOverhead =
      details.baseHeader +
      details.typeSpecificHeader +
      (details.encryptionOverhead || 0) +
      (details.variableOverhead || 0);

    const totalCapacity = params.blockSize as number;
    let availableCapacity = totalCapacity - totalOverhead;

    if (alignCapacityToTuple) {
      // Ensure capacity is aligned to tuple size
      availableCapacity =
        Math.floor(availableCapacity / CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH) *
        CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH;
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
      CONSTANTS.UINT16_SIZE + // Filename length (2 bytes)
      filename.length + // Actual filename
      CONSTANTS.UINT8_SIZE + // Mimetype length (1 byte)
      mimetype.length; // Actual mimetype

    return extendedHeaderSize;
  }
}
