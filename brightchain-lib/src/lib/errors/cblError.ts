import BrightChainStrings from '../enumerations/brightChainStrings';
import { CblErrorType } from '../enumerations/cblErrorType';
import { TypedError } from './typedError';

export class CblError extends TypedError<CblErrorType> {
  protected get reasonMap(): Record<CblErrorType, BrightChainStrings> {
    return {
      [CblErrorType.CblRequired]: BrightChainStrings.Error_CblErrorCblRequired,
      [CblErrorType.WhitenedBlockFunctionRequired]:
        BrightChainStrings.Error_CblErrorWhitenedBlockFunctionRequired,
      [CblErrorType.FailedToLoadBlock]:
        BrightChainStrings.Error_CblErrorFailedToLoadBlock,
      [CblErrorType.ExpectedEncryptedDataBlock]:
        BrightChainStrings.Error_CblErrorExpectedEncryptedDataBlock,
      [CblErrorType.ExpectedOwnedDataBlock]:
        BrightChainStrings.Error_CblErrorExpectedOwnedDataBlock,
      [CblErrorType.InvalidStructure]:
        BrightChainStrings.Error_CblErrorInvalidStructure,
      [CblErrorType.CreatorUndefined]:
        BrightChainStrings.Error_CblErrorCreatorUndefined,
      [CblErrorType.BlockNotReadable]:
        BrightChainStrings.Error_CblErrorBlockNotReadable,
      [CblErrorType.CreatorRequiredForSignature]:
        BrightChainStrings.Error_CblErrorCreatorRequiredForSignature,
      [CblErrorType.InvalidCreatorId]:
        BrightChainStrings.Error_CblErrorInvalidCreatorId,
      [CblErrorType.FileNameRequired]:
        BrightChainStrings.Error_CblErrorFileNameRequired,
      [CblErrorType.FileNameEmpty]:
        BrightChainStrings.Error_CblErrorFileNameEmpty,
      [CblErrorType.FileNameWhitespace]:
        BrightChainStrings.Error_CblErrorFileNameWhitespace,
      [CblErrorType.FileNameInvalidChar]:
        BrightChainStrings.Error_CblErrorFileNameInvalidChar,
      [CblErrorType.FileNameControlChars]:
        BrightChainStrings.Error_CblErrorFileNameControlChars,
      [CblErrorType.FileNamePathTraversal]:
        BrightChainStrings.Error_CblErrorFileNamePathTraversal,
      [CblErrorType.MimeTypeRequired]:
        BrightChainStrings.Error_CblErrorMimeTypeRequired,
      [CblErrorType.MimeTypeEmpty]:
        BrightChainStrings.Error_CblErrorMimeTypeEmpty,
      [CblErrorType.MimeTypeWhitespace]:
        BrightChainStrings.Error_CblErrorMimeTypeWhitespace,
      [CblErrorType.MimeTypeLowercase]:
        BrightChainStrings.Error_CblErrorMimeTypeLowercase,
      [CblErrorType.MimeTypeInvalidFormat]:
        BrightChainStrings.Error_CblErrorMimeTypeInvalidFormat,
      [CblErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_CblErrorInvalidBlockSize,
      [CblErrorType.MetadataSizeExceeded]:
        BrightChainStrings.Error_CblErrorMetadataSizeExceeded,
      [CblErrorType.MetadataSizeNegative]:
        BrightChainStrings.Error_CblErrorMetadataSizeNegative,
      [CblErrorType.InvalidMetadataBuffer]:
        BrightChainStrings.Error_CblErrorInvalidMetadataBuffer,
      [CblErrorType.NotExtendedCbl]:
        BrightChainStrings.Error_CblErrorNotExtendedCbl,
      [CblErrorType.InvalidSignature]:
        BrightChainStrings.Error_CblErrorInvalidSignature,
      [CblErrorType.CreatorIdMismatch]:
        BrightChainStrings.Error_CblErrorCreatorIdMismatch,
      [CblErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_CblErrorInvalidTupleSize,
      [CblErrorType.FileNameTooLong]:
        BrightChainStrings.Error_CblErrorFileNameTooLong,
      [CblErrorType.MimeTypeTooLong]:
        BrightChainStrings.Error_CblErrorMimeTypeTooLong,
      [CblErrorType.AddressCountExceedsCapacity]:
        BrightChainStrings.Error_CblErrorAddressCountExceedsCapacity,
      [CblErrorType.FileSizeTooLarge]:
        BrightChainStrings.Error_CblErrorFileSizeTooLarge,
      [CblErrorType.FileSizeTooLargeForNode]:
        BrightChainStrings.Error_CblErrorFileSizeTooLargeForNode,
      [CblErrorType.CblEncrypted]:
        BrightChainStrings.Error_CblErrorCblEncrypted,
      [CblErrorType.UserRequiredForDecryption]:
        BrightChainStrings.Error_CblErrorUserRequiredForDecryption,
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
