import { BlockErrorType } from '../../enumerations/blockErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import StringNames from '../../enumerations/stringNames';
import { TypedError } from '../typedError';

export class BlockError extends TypedError<BlockErrorType> {
  public get reasonMap(): Record<BlockErrorType, StringNames> {
    return {
      [BlockErrorType.CreatorRequiredForEncryption]:
        StringNames.Error_BlockErrorCreatorRequiredForEncryption,
      [BlockErrorType.CannotEncrypt]: StringNames.Error_BlockErrorCannotEncrypt,
      [BlockErrorType.CannotDecrypt]: StringNames.Error_BlockErrorCannotEncrypt,
      [BlockErrorType.ActualDataLengthExceedsDataLength]:
        StringNames.Error_BlockErrorActualDataLengthExceedsDataLength,
      [BlockErrorType.ActualDataLengthNegative]:
        StringNames.Error_BlockErrorActualDataLengthNegative,
      [BlockErrorType.CreatorRequired]:
        StringNames.Error_BlockErrorCreatorRequired,
      [BlockErrorType.DataRequired]: StringNames.Error_BlockErrorDataRequired,
      [BlockErrorType.DataLengthExceedsCapacity]:
        StringNames.Error_BlockErrorDataLengthExceedsCapacity,
      [BlockErrorType.UnexpectedEncryptedBlockType]:
        StringNames.Error_BlockErrorUnexpectedEncryptedBlockType,
      [BlockErrorType.CreatorPrivateKeyRequired]:
        StringNames.Error_BlockErrorCreatorPrivateKeyRequired,
      [BlockErrorType.InvalidMultiEncryptionRecipientCount]:
        StringNames.Error_BlockErrorInvalidMultiEncryptionRecipientCount,
      [BlockErrorType.InvalidNewBlockType]:
        StringNames.Error_BlockErrorInvalidNewBlockType,
      [BlockErrorType.UnexpectedEphemeralBlockType]:
        StringNames.Error_BlockErrorUnexpectedEphemeralBlockType,
      [BlockErrorType.RecipientRequired]:
        StringNames.Error_BlockErrorRecipientRequired,
      [BlockErrorType.RecipientKeyRequired]:
        StringNames.Error_BlockErrorRecipientKeyRequired,
    };
  }

  constructor(
    type: BlockErrorType,
    language?: StringLanguages,
    otherVars?: Record<string, string | number>,
  ) {
    super(type, language, otherVars);
    this.name = 'BlockError';
  }
}
