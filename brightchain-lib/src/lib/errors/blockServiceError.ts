import { BlockServiceErrorType } from '../enumerations/blockServiceErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class BlockServiceError extends TypedError<BlockServiceErrorType> {
  public get reasonMap(): Record<BlockServiceErrorType, StringNames> {
    return {
      [BlockServiceErrorType.EmptyBlocksArray]:
        StringNames.Error_BlockServiceErrorEmptyBlocksArray,
      [BlockServiceErrorType.BlockSizeMismatch]:
        StringNames.Error_BlockServiceErrorBlockSizeMismatch,
      [BlockServiceErrorType.NoWhitenersProvided]:
        StringNames.Error_BlockServiceErrorNoWhitenersProvided,
      [BlockServiceErrorType.AlreadyInitialized]:
        StringNames.Error_BlockServiceErrorAlreadyInitialized,
      [BlockServiceErrorType.Uninitialized]:
        StringNames.Error_BlockServiceErrorUninitialized,
      [BlockServiceErrorType.BlockAlreadyExists]:
        StringNames.Error_BlockServiceErrorBlockAlreadyExistsTemplate,
      [BlockServiceErrorType.RecipientRequiredForEncryption]:
        StringNames.Error_BlockServiceErrorRecipientRequiredForEncryption,
      [BlockServiceErrorType.CannotDetermineLength]:
        StringNames.Error_BlockServiceErrorCannotDetermineFileLength,
      [BlockServiceErrorType.CannotDetermineBlockSize]:
        StringNames.Error_BlockServiceErrorUnableToDetermineBlockSize,
      [BlockServiceErrorType.FilePathNotProvided]:
        StringNames.Error_BlockServiceErrorFilePathNotProvided,
      [BlockServiceErrorType.CannotDetermineFileName]:
        StringNames.Error_BlockServiceErrorCannotDetermineFileName,
      [BlockServiceErrorType.CannotDetermineMimeType]:
        StringNames.Error_BlockServiceErrorCannotDetermineMimeType,
    };
  }

  constructor(
    type: BlockServiceErrorType,
    language?: StringLanguages,
    otherVars?: Record<string, string | number>,
  ) {
    super(type, language, otherVars);
    this.name = 'BlockServiceError';
  }
}
