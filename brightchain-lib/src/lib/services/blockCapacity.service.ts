import { CBL, CONSTANTS, ECIES, ENCRYPTION } from '../constants';
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { validateBlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType'; // Keep this import
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

    // Validate block type
    if (!Object.values(BlockType).includes(params.blockType as BlockType)) {
      throw new BlockCapacityError(BlockCapacityErrorType.InvalidBlockType);
    }

    // Initialize overhead breakdown
    const details: IOverheadBreakdown = {
      baseHeader: 0,
      typeSpecificOverhead: 0, // Will hold ENCRYPTION_TYPE_SIZE if encrypted
      encryptionOverhead: 0,
      variableOverhead: 0, // Will hold extended header part size
    };

    let alignCapacityToTuple = false;
    const isCBL = [
      BlockType.ConstituentBlockList,
      BlockType.EncryptedConstituentBlockListBlock,
      BlockType.ExtendedConstituentBlockListBlock,
      BlockType.EncryptedExtendedConstituentBlockListBlock,
    ].includes(params.blockType);
    const isExtended = [
      BlockType.ExtendedConstituentBlockListBlock,
      BlockType.EncryptedExtendedConstituentBlockListBlock,
    ].includes(params.blockType);
    // Flag for inherently encrypted block types
    const isInherentlyEncrypted = [
      BlockType.EncryptedConstituentBlockListBlock,
      BlockType.EncryptedExtendedConstituentBlockListBlock,
      BlockType.EncryptedOwnedDataBlock,
    ].includes(params.blockType);

    // Set base header size for CBL types
    if (isCBL) {
      details.baseHeader = CBL.BASE_OVERHEAD; // 170 bytes (includes signature)
      alignCapacityToTuple = true;
    }

    // Add variable overhead for Extended CBL
    if (isExtended) {
      if (!params.cbl) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidExtendedCblData,
        );
      }
      // Check for missing filename/mimetype *before* validation
      if (!params.cbl.fileName) {
        throw new BlockCapacityError(BlockCapacityErrorType.InvalidFileName);
      }
      if (!params.cbl.mimeType) {
        throw new BlockCapacityError(BlockCapacityErrorType.InvalidMimeType);
      }
      // Validate filename and mimetype format (throws ExtendedCblError if format is wrong)
      this.cblService.validateFileNameFormat(params.cbl.fileName);
      this.cblService.validateMimeTypeFormat(params.cbl.mimeType);
      // Assign variable part size
      details.variableOverhead = this.calculateExtendedCBLOverhead(
        params.cbl.fileName,
        params.cbl.mimeType,
      );
    }

    // Add encryption overhead and type size if an encryption type is specified
    if (params.encryptionType !== BlockEncryptionType.None) {
      // Check if the specified blockType *can* be encrypted.
      const canBeEncrypted = [
        BlockType.RawData, // Added RawData
        BlockType.EphemeralOwnedDataBlock,
        BlockType.ConstituentBlockList,
        BlockType.ExtendedConstituentBlockListBlock,
        BlockType.EncryptedOwnedDataBlock, // Already encrypted, but applying again might be valid? Revisit if needed.
        BlockType.EncryptedConstituentBlockListBlock,
        BlockType.EncryptedExtendedConstituentBlockListBlock,
      ].includes(params.blockType);

      if (!canBeEncrypted) {
        throw new BlockCapacityError(
          BlockCapacityErrorType.InvalidEncryptionType, // Removed string argument
        );
      }

      // Validate recipient count for MultiRecipient
      if (params.encryptionType === BlockEncryptionType.MultiRecipient) {
        if (!params.recipientCount || params.recipientCount < 1) {
          throw new BlockCapacityError(
            BlockCapacityErrorType.InvalidRecipientCount, // Removed string argument
          );
        } else if (params.recipientCount > ECIES.MULTIPLE.MAX_RECIPIENTS) {
          throw new BlockCapacityError(
            BlockCapacityErrorType.InvalidRecipientCount, // Removed string argument
          );
        }
      }

      // Add the 1 byte for the encryption type enum
      details.typeSpecificOverhead += ENCRYPTION.ENCRYPTION_TYPE_SIZE;

      // Calculate the actual encryption overhead
      details.encryptionOverhead =
        params.encryptionType === BlockEncryptionType.MultiRecipient
          ? this.eciesService.calculateECIESMultipleRecipientOverhead(
              params.recipientCount ?? 0, // Already validated above
              true, // Include message overhead (IV+AuthTag+CRC)
            )
          : ECIES.OVERHEAD_SIZE + ENCRYPTION.RECIPIENT_ID_SIZE; // Single-recipient overhead
    } else if (isInherentlyEncrypted) {
      // If the block type IS inherently encrypted but encryptionType is None, it's an error.
      throw new BlockCapacityError(
        BlockCapacityErrorType.InvalidEncryptionType, // Removed string argument
      );
    }
    // Note: No 'else' needed here; if encryptionType is None and blockType is not inherently encrypted, overheads remain 0.

    // Calculate total overhead and available capacity
    const totalOverhead =
      details.baseHeader +
      details.typeSpecificOverhead +
      details.encryptionOverhead +
      details.variableOverhead;

    const totalCapacity = params.blockSize as number;
    let availableCapacity = totalCapacity - totalOverhead;

    if (availableCapacity < 0) {
      // Restore the throw for CapacityExceeded
      throw new BlockCapacityError(BlockCapacityErrorType.CapacityExceeded);
    } else if (alignCapacityToTuple) {
      // Align capacity *down* to the nearest multiple of address size
      availableCapacity =
        Math.floor(availableCapacity / CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH) *
        CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH;
    }
    // Ensure final capacity is not negative after alignment
    availableCapacity = Math.max(0, availableCapacity);

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
    // - 2 bytes for filename length
    // - Actual filename bytes
    // - 1 byte for mimetype length
    // - Actual mimetype bytes
    const extendedHeaderSize =
      CONSTANTS.UINT16_SIZE + // Filename length (2 bytes)
      filename.length + // Actual filename
      CONSTANTS.UINT8_SIZE + // Mimetype length (1 byte)
      mimetype.length; // Actual mimetype

    return extendedHeaderSize;
  }
}
