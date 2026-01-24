import { BlockErrorType } from '../../enumerations/blockErrorType';
import BrightChainStrings from '../../enumerations/brightChainStrings';
import { TypedError } from '../typedError';

export class BlockError extends TypedError<BlockErrorType> {
  public get reasonMap(): Record<BlockErrorType, BrightChainStrings> {
    return {
      [BlockErrorType.CreatorRequiredForEncryption]:
        BrightChainStrings.Error_BlockErrorCreatorRequiredForEncryption,
      [BlockErrorType.CannotEncrypt]:
        BrightChainStrings.Error_BlockErrorCannotEncrypt,
      [BlockErrorType.CannotDecrypt]:
        BrightChainStrings.Error_BlockErrorCannotEncrypt,
      [BlockErrorType.ActualDataLengthExceedsDataLength]:
        BrightChainStrings.Error_BlockErrorActualDataLengthExceedsDataLength,
      [BlockErrorType.ActualDataLengthNegative]:
        BrightChainStrings.Error_BlockErrorActualDataLengthNegative,
      [BlockErrorType.CreatorRequired]:
        BrightChainStrings.Error_BlockErrorCreatorRequired,
      [BlockErrorType.DataRequired]:
        BrightChainStrings.Error_BlockErrorDataRequired,
      [BlockErrorType.DataLengthExceedsCapacity]:
        BrightChainStrings.Error_BlockErrorDataLengthExceedsCapacity,
      [BlockErrorType.UnexpectedEncryptedBlockType]:
        BrightChainStrings.Error_BlockErrorUnexpectedEncryptedBlockType,
      [BlockErrorType.CreatorPrivateKeyRequired]:
        BrightChainStrings.Error_BlockErrorCreatorPrivateKeyRequired,
      [BlockErrorType.InvalidMultiEncryptionRecipientCount]:
        BrightChainStrings.Error_BlockErrorInvalidMultiEncryptionRecipientCount,
      [BlockErrorType.InvalidNewBlockType]:
        BrightChainStrings.Error_BlockErrorInvalidNewBlockType,
      [BlockErrorType.UnexpectedEphemeralBlockType]:
        BrightChainStrings.Error_BlockErrorUnexpectedEphemeralBlockType,
      [BlockErrorType.RecipientRequired]:
        BrightChainStrings.Error_BlockErrorRecipientRequired,
      [BlockErrorType.RecipientKeyRequired]:
        BrightChainStrings.Error_BlockErrorRecipientKeyRequired,
    };
  }

  constructor(
    type: BlockErrorType,
    language?: string,
    otherVars?: Record<string, string | number>,
  ) {
    super(type, undefined, otherVars);
    this.name = 'BlockError';
  }
}
