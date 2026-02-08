import { BlockCapacityErrorType } from '../../enumerations/blockCapacityErrorType';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';
import { TypedError } from '../typedError';

export class BlockCapacityError extends TypedError<BlockCapacityErrorType> {
  protected get reasonMap(): Record<
    BlockCapacityErrorType,
    BrightChainStringKey
  > {
    return {
      [BlockCapacityErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_BlockCapacity_InvalidBlockSize,
      [BlockCapacityErrorType.InvalidBlockType]:
        BrightChainStrings.Error_BlockCapacity_InvalidBlockType,
      [BlockCapacityErrorType.CapacityExceeded]:
        BrightChainStrings.Error_BlockCapacity_CapacityExceeded,
      [BlockCapacityErrorType.InvalidFileName]:
        BrightChainStrings.Error_BlockCapacity_InvalidFileName,
      [BlockCapacityErrorType.InvalidMimeType]:
        BrightChainStrings.Error_BlockCapacity_InvalidMimetype,
      [BlockCapacityErrorType.InvalidRecipientCount]:
        BrightChainStrings.Error_BlockCapacity_InvalidRecipientCount,
      [BlockCapacityErrorType.InvalidExtendedCblData]:
        BrightChainStrings.Error_BlockCapacity_InvalidExtendedCblData,
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
