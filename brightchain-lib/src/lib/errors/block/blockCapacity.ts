import { BlockCapacityErrorType } from '../../enumerations/blockCapacityErrorType';
import BrightChainStrings from '../../enumerations/brightChainStrings';
import { TypedError } from '../typedError';

export class BlockCapacityError extends TypedError<BlockCapacityErrorType> {
  protected get reasonMap(): Record<
    BlockCapacityErrorType,
    BrightChainStrings
  > {
    return {
      [BlockCapacityErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_BlockCapacityInvalidBlockSize,
      [BlockCapacityErrorType.InvalidBlockType]:
        BrightChainStrings.Error_BlockCapacityInvalidBlockType,
      [BlockCapacityErrorType.CapacityExceeded]:
        BrightChainStrings.Error_BlockCapacityCapacityExceeded,
      [BlockCapacityErrorType.InvalidFileName]:
        BrightChainStrings.Error_BlockCapacityInvalidFileName,
      [BlockCapacityErrorType.InvalidMimeType]:
        BrightChainStrings.Error_BlockCapacityInvalidMimetype,
      [BlockCapacityErrorType.InvalidRecipientCount]:
        BrightChainStrings.Error_BlockCapacityInvalidRecipientCount,
      [BlockCapacityErrorType.InvalidExtendedCblData]:
        BrightChainStrings.Error_BlockCapacityInvalidExtendedCblData,
    };
  }

  constructor(
    type: BlockCapacityErrorType,
    language?: string,
    otherVars?: Record<string, string | number>,
  ) {
    super(type, undefined, otherVars);
    this.name = 'BlockCapacityError';

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BlockCapacityError.prototype);
  }
}
