import { CblErrorType } from '../enumerations/cblErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class CblError extends TypedError<CblErrorType> {
  protected get reasonMap(): Record<CblErrorType, StringNames> {
    return {
      [CblErrorType.CblRequired]: StringNames.Error_CblErrorCblRequired,
      [CblErrorType.WhitenedBlockFunctionRequired]:
        StringNames.Error_CblErrorWhitenedBlockFunctionRequired,
      [CblErrorType.FailedToLoadBlock]:
        StringNames.Error_CblErrorFailedToLoadBlock,
      [CblErrorType.ExpectedEncryptedDataBlock]:
        StringNames.Error_CblErrorExpectedEncryptedDataBlock,
      [CblErrorType.ExpectedOwnedDataBlock]:
        StringNames.Error_CblErrorExpectedOwnedDataBlock,
      [CblErrorType.InvalidStructure]:
        StringNames.Error_CblErrorInvalidStructure,
      [CblErrorType.CreatorUndefined]:
        StringNames.Error_CblErrorCreatorUndefined,
      [CblErrorType.BlockNotReadable]:
        StringNames.Error_CblErrorBlockNotReadable,
      [CblErrorType.CreatorRequiredForSignature]:
        StringNames.Error_CblErrorCreatorRequiredForSignature,
      [CblErrorType.FileNameRequired]:
        StringNames.Error_CblErrorFileNameRequired,
      [CblErrorType.FileNameEmpty]: StringNames.Error_CblErrorFileNameEmpty,
      [CblErrorType.FileNameWhitespace]:
        StringNames.Error_CblErrorFileNameWhitespace,
      [CblErrorType.FileNameInvalidChar]:
        StringNames.Error_CblErrorFileNameInvalidChar,
      [CblErrorType.FileNameControlChars]:
        StringNames.Error_CblErrorFileNameControlChars,
      [CblErrorType.FileNamePathTraversal]:
        StringNames.Error_CblErrorFileNamePathTraversal,
      [CblErrorType.MimeTypeRequired]:
        StringNames.Error_CblErrorMimeTypeRequired,
      [CblErrorType.MimeTypeEmpty]: StringNames.Error_CblErrorMimeTypeEmpty,
      [CblErrorType.MimeTypeWhitespace]:
        StringNames.Error_CblErrorMimeTypeWhitespace,
      [CblErrorType.MimeTypeLowercase]:
        StringNames.Error_CblErrorMimeTypeLowercase,
      [CblErrorType.MimeTypeInvalidFormat]:
        StringNames.Error_CblErrorMimeTypeInvalidFormat,
      [CblErrorType.InvalidBlockSize]:
        StringNames.Error_CblErrorInvalidBlockSize,
      [CblErrorType.MetadataSizeExceeded]:
        StringNames.Error_CblErrorMetadataSizeExceeded,
      [CblErrorType.MetadataSizeNegative]:
        StringNames.Error_CblErrorMetadataSizeNegative,
      [CblErrorType.InvalidMetadataBuffer]:
        StringNames.Error_CblErrorInvalidMetadataBuffer,
      [CblErrorType.NotExtendedCbl]: StringNames.Error_CblErrorNotExtendedCbl,
      [CblErrorType.InvalidSignature]:
        StringNames.Error_CblErrorInvalidSignature,
      [CblErrorType.InvalidTupleSize]:
        StringNames.Error_CblErrorInvalidTupleSize,
      [CblErrorType.FileNameTooLong]: StringNames.Error_CblErrorFileNameTooLong,
      [CblErrorType.MimeTypeTooLong]: StringNames.Error_CblErrorMimeTypeTooLong,
      [CblErrorType.AddressCountExceedsCapacity]:
        StringNames.Error_CblErrorAddressCountExceedsCapacity,
      [CblErrorType.FileSizeTooLarge]:
        StringNames.Error_CblErrorFileSizeTooLarge,
      [CblErrorType.FileSizeTooLargeForNode]:
        StringNames.Error_CblErrorFileSizeTooLargeForNode,
      [CblErrorType.CblEncrypted]: StringNames.Error_CblErrorCblEncrypted,
      [CblErrorType.UserRequiredForDecryption]:
        StringNames.Error_CblErrorUserRequiredForDecryption,
    };
  }
  constructor(
    type: CblErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(type, language, templateParams);
    this.name = 'CblError';
  }
}
