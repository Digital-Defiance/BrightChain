import { BlockServiceErrorType } from '../enumerations/blockServiceErrorType';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class BlockServiceError extends TypedError<BlockServiceErrorType> {
  public get reasonMap(): Record<BlockServiceErrorType, BrightChainStringKey> {
    return {
      [BlockServiceErrorType.EmptyBlocksArray]:
        BrightChainStrings.Error_BlockServiceError_EmptyBlocksArray,
      [BlockServiceErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_BlockServiceError_BlockSizeMismatch,
      [BlockServiceErrorType.NoWhitenersProvided]:
        BrightChainStrings.Error_BlockServiceError_NoWhitenersProvided,
      [BlockServiceErrorType.AlreadyInitialized]:
        BrightChainStrings.Error_BlockServiceError_AlreadyInitialized,
      [BlockServiceErrorType.Uninitialized]:
        BrightChainStrings.Error_BlockServiceError_Uninitialized,
      [BlockServiceErrorType.BlockAlreadyExists]:
        BrightChainStrings.Error_BlockServiceError_BlockAlreadyExistsTemplate,
      [BlockServiceErrorType.RecipientRequiredForEncryption]:
        BrightChainStrings.Error_BlockServiceError_RecipientRequiredForEncryption,
      [BlockServiceErrorType.CannotDetermineLength]:
        BrightChainStrings.Error_BlockServiceError_CannotDetermineFileLength,
      [BlockServiceErrorType.CannotDetermineBlockSize]:
        BrightChainStrings.Error_BlockServiceError_UnableToDetermineBlockSize,
      [BlockServiceErrorType.FilePathNotProvided]:
        BrightChainStrings.Error_BlockServiceError_FilePathNotProvided,
      [BlockServiceErrorType.CannotDetermineFileName]:
        BrightChainStrings.Error_BlockServiceError_CannotDetermineFileName,
      [BlockServiceErrorType.CannotDetermineMimeType]:
        BrightChainStrings.Error_BlockServiceError_CannotDetermineMimeType,
      [BlockServiceErrorType.InvalidBlockData]:
        BrightChainStrings.Error_BlockServiceError_InvalidBlockData,
      [BlockServiceErrorType.InvalidBlockType]:
        BrightChainStrings.Error_BlockServiceError_InvalidBlockType,
    };
  }

  constructor(
    type: BlockServiceErrorType,
    language?: string,
    otherVars?: Record<string, string | number>,
  ) {
    super(type, undefined, otherVars);
    this.name = 'BlockServiceError';
  }
}
