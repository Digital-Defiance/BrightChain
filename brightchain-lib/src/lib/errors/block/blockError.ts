import { BlockErrorType } from '../../enumerations/blockErrorType';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../../enumerations/brightChainStrings';
import { TypedError } from '../typedError';

export class BlockError extends TypedError<BlockErrorType> {
  public get reasonMap(): Record<BlockErrorType, BrightChainStringKey> {
    return {
      [BlockErrorType.CreatorRequiredForEncryption]:
        BrightChainStrings.Error_BlockError_CreatorRequiredForEncryption,
      [BlockErrorType.CannotEncrypt]:
        BrightChainStrings.Error_BlockError_CannotEncrypt,
      [BlockErrorType.CannotDecrypt]:
        BrightChainStrings.Error_BlockError_CannotEncrypt,
      [BlockErrorType.ActualDataLengthExceedsDataLength]:
        BrightChainStrings.Error_BlockError_ActualDataLengthExceedsDataLength,
      [BlockErrorType.ActualDataLengthNegative]:
        BrightChainStrings.Error_BlockError_ActualDataLengthNegative,
      [BlockErrorType.CreatorRequired]:
        BrightChainStrings.Error_BlockError_CreatorRequired,
      [BlockErrorType.DataRequired]:
        BrightChainStrings.Error_BlockError_DataRequired,
      [BlockErrorType.DataLengthExceedsCapacity]:
        BrightChainStrings.Error_BlockError_DataLengthExceedsCapacity,
      [BlockErrorType.UnexpectedEncryptedBlockType]:
        BrightChainStrings.Error_BlockError_UnexpectedEncryptedBlockType,
      [BlockErrorType.CreatorPrivateKeyRequired]:
        BrightChainStrings.Error_BlockError_CreatorPrivateKeyRequired,
      [BlockErrorType.InvalidMultiEncryptionRecipientCount]:
        BrightChainStrings.Error_BlockError_InvalidMultiEncryptionRecipientCount,
      [BlockErrorType.InvalidNewBlockType]:
        BrightChainStrings.Error_BlockError_InvalidNewBlockType,
      [BlockErrorType.UnexpectedEphemeralBlockType]:
        BrightChainStrings.Error_BlockError_UnexpectedEphemeralBlockType,
      [BlockErrorType.RecipientRequired]:
        BrightChainStrings.Error_BlockError_RecipientRequired,
      [BlockErrorType.RecipientKeyRequired]:
        BrightChainStrings.Error_BlockError_RecipientKeyRequired,
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
