import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class BlockCapacityError extends TypedError<BlockCapacityErrorType> {
  protected get reasonMap(): Record<BlockCapacityErrorType, StringNames> {
    return {
      [BlockCapacityErrorType.InvalidBlockSize]:
        StringNames.Error_BlockCapacityInvalidBlockSize,
      [BlockCapacityErrorType.InvalidBlockType]:
        StringNames.Error_BlockCapacityInvalidBlockType,
      [BlockCapacityErrorType.CapacityExceeded]:
        StringNames.Error_BlockCapacityCapacityExceeded,
      [BlockCapacityErrorType.InvalidFileName]:
        StringNames.Error_BlockCapacityInvalidFileName,
      [BlockCapacityErrorType.InvalidMimeType]:
        StringNames.Error_BlockCapacityInvalidMimetype,
      [BlockCapacityErrorType.InvalidRecipientCount]:
        StringNames.Error_BlockCapacityInvalidRecipientCount,
      [BlockCapacityErrorType.InvalidExtendedCblData]:
        StringNames.Error_BlockCapacityInvalidExtendedCblData,
      // Added
      [BlockCapacityErrorType.InvalidEncryptionType]:
        StringNames.Error_BlockCapacityInvalidEncryptionType, // Added
    };
  }

  constructor(
    type: BlockCapacityErrorType,
    language?: StringLanguages,
    otherVars?: Record<string, string | number>,
  ) {
    super(type, language, otherVars);
    this.name = 'BlockCapacityError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BlockCapacityError.prototype);
  }
}
