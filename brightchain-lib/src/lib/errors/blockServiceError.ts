import { BlockServiceErrorType } from '../enumerations/blockServiceErrorType';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class BlockServiceError extends TypedError<BlockServiceErrorType> {
  public get reasonMap(): Record<BlockServiceErrorType, BrightChainStrings> {
    return {
      [BlockServiceErrorType.EmptyBlocksArray]:
        BrightChainStrings.Error_BlockServiceErrorEmptyBlocksArray,
      [BlockServiceErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_BlockServiceErrorBlockSizeMismatch,
      [BlockServiceErrorType.NoWhitenersProvided]:
        BrightChainStrings.Error_BlockServiceErrorNoWhitenersProvided,
      [BlockServiceErrorType.AlreadyInitialized]:
        BrightChainStrings.Error_BlockServiceErrorAlreadyInitialized,
      [BlockServiceErrorType.Uninitialized]:
        BrightChainStrings.Error_BlockServiceErrorUninitialized,
      [BlockServiceErrorType.BlockAlreadyExists]:
        BrightChainStrings.Error_BlockServiceErrorBlockAlreadyExistsTemplate,
      [BlockServiceErrorType.RecipientRequiredForEncryption]:
        BrightChainStrings.Error_BlockServiceErrorRecipientRequiredForEncryption,
      [BlockServiceErrorType.CannotDetermineLength]:
        BrightChainStrings.Error_BlockServiceErrorCannotDetermineFileLength,
      [BlockServiceErrorType.CannotDetermineBlockSize]:
        BrightChainStrings.Error_BlockServiceErrorUnableToDetermineBlockSize,
      [BlockServiceErrorType.FilePathNotProvided]:
        BrightChainStrings.Error_BlockServiceErrorFilePathNotProvided,
      [BlockServiceErrorType.CannotDetermineFileName]:
        BrightChainStrings.Error_BlockServiceErrorCannotDetermineFileName,
      [BlockServiceErrorType.CannotDetermineMimeType]:
        BrightChainStrings.Error_BlockServiceErrorCannotDetermineMimeType,
      [BlockServiceErrorType.InvalidBlockData]:
        BrightChainStrings.Error_BlockServiceErrorInvalidBlockData,
      [BlockServiceErrorType.InvalidBlockType]:
        BrightChainStrings.Error_BlockServiceErrorInvalidBlockType,
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
