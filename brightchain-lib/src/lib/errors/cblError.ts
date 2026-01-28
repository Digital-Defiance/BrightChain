import BrightChainStrings from '../enumerations/brightChainStrings';
import { CblErrorType } from '../enumerations/cblErrorType';
import { TypedError } from './typedError';

export class CblError extends TypedError<CblErrorType> {
  protected get reasonMap(): Record<CblErrorType, BrightChainStrings> {
    return {
      [CblErrorType.CblRequired]: BrightChainStrings.Error_CblError_CblRequired,
      [CblErrorType.WhitenedBlockFunctionRequired]:
        BrightChainStrings.Error_CblError_WhitenedBlockFunctionRequired,
      [CblErrorType.FailedToLoadBlock]:
        BrightChainStrings.Error_CblError_FailedToLoadBlock,
      [CblErrorType.ExpectedEncryptedDataBlock]:
        BrightChainStrings.Error_CblError_ExpectedEncryptedDataBlock,
      [CblErrorType.ExpectedOwnedDataBlock]:
        BrightChainStrings.Error_CblError_ExpectedOwnedDataBlock,
      [CblErrorType.InvalidStructure]:
        BrightChainStrings.Error_CblError_InvalidStructure,
      [CblErrorType.CreatorUndefined]:
        BrightChainStrings.Error_CblError_CreatorUndefined,
      [CblErrorType.BlockNotReadable]:
        BrightChainStrings.Error_CblError_BlockNotReadable,
      [CblErrorType.CreatorRequiredForSignature]:
        BrightChainStrings.Error_CblError_CreatorRequiredForSignature,
      [CblErrorType.InvalidCreatorId]:
        BrightChainStrings.Error_CblError_InvalidCreatorId,
      [CblErrorType.FileNameRequired]:
        BrightChainStrings.Error_CblError_FileNameRequired,
      [CblErrorType.FileNameEmpty]:
        BrightChainStrings.Error_CblError_FileNameEmpty,
      [CblErrorType.FileNameWhitespace]:
        BrightChainStrings.Error_CblError_FileNameWhitespace,
      [CblErrorType.FileNameInvalidChar]:
        BrightChainStrings.Error_CblError_FileNameInvalidChar,
      [CblErrorType.FileNameControlChars]:
        BrightChainStrings.Error_CblError_FileNameControlChars,
      [CblErrorType.FileNamePathTraversal]:
        BrightChainStrings.Error_CblError_FileNamePathTraversal,
      [CblErrorType.MimeTypeRequired]:
        BrightChainStrings.Error_CblError_MimeTypeRequired,
      [CblErrorType.MimeTypeEmpty]:
        BrightChainStrings.Error_CblError_MimeTypeEmpty,
      [CblErrorType.MimeTypeWhitespace]:
        BrightChainStrings.Error_CblError_MimeTypeWhitespace,
      [CblErrorType.MimeTypeLowercase]:
        BrightChainStrings.Error_CblError_MimeTypeLowercase,
      [CblErrorType.MimeTypeInvalidFormat]:
        BrightChainStrings.Error_CblError_MimeTypeInvalidFormat,
      [CblErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_CblError_InvalidBlockSize,
      [CblErrorType.MetadataSizeExceeded]:
        BrightChainStrings.Error_CblError_MetadataSizeExceeded,
      [CblErrorType.MetadataSizeNegative]:
        BrightChainStrings.Error_CblError_MetadataSizeNegative,
      [CblErrorType.InvalidMetadataBuffer]:
        BrightChainStrings.Error_CblError_InvalidMetadataBuffer,
      [CblErrorType.NotExtendedCbl]:
        BrightChainStrings.Error_CblError_NotExtendedCbl,
      [CblErrorType.InvalidSignature]:
        BrightChainStrings.Error_CblError_InvalidSignature,
      [CblErrorType.CreatorIdMismatch]:
        BrightChainStrings.Error_CblError_CreatorIdMismatch,
      [CblErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_CblError_InvalidTupleSize,
      [CblErrorType.FileNameTooLong]:
        BrightChainStrings.Error_CblError_FileNameTooLong,
      [CblErrorType.MimeTypeTooLong]:
        BrightChainStrings.Error_CblError_MimeTypeTooLong,
      [CblErrorType.AddressCountExceedsCapacity]:
        BrightChainStrings.Error_CblError_AddressCountExceedsCapacity,
      [CblErrorType.FileSizeTooLarge]:
        BrightChainStrings.Error_CblError_FileSizeTooLarge,
      [CblErrorType.FileSizeTooLargeForNode]:
        BrightChainStrings.Error_CblError_FileSizeTooLargeForNode,
      [CblErrorType.CblEncrypted]:
        BrightChainStrings.Error_CblError_CblEncrypted,
      [CblErrorType.UserRequiredForDecryption]:
        BrightChainStrings.Error_CblError_UserRequiredForDecryption,
      [CblErrorType.FailedToExtractCreatorId]:
        BrightChainStrings.Error_CblError_FailedToExtractCreatorId,
      [CblErrorType.FailedToExtractProvidedCreatorId]:
        BrightChainStrings.Error_CblError_FailedToExtractProvidedCreatorId,
    };
  }
  constructor(
    type: CblErrorType,
    language?: string,
    templateParams?: Record<string, string>,
  ) {
    super(type, undefined, templateParams);
    this.name = 'CblError';
  }
}
