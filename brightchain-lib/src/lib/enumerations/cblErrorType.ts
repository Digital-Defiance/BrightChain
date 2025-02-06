import { StringNames } from './stringNames';

export enum CblErrorType {
  CblRequired = 'CblRequired',
  WhitenedBlockFunctionRequired = 'WhitenedBlockFunctionRequired',
  FailedToLoadBlock = 'FailedToLoadBlock',
  ExpectedEncryptedDataBlock = 'ExpectedEncryptedDataBlock',
  ExpectedOwnedDataBlock = 'ExpectedOwnedDataBlock',
  InvalidStructure = 'InvalidStructure',
  CreatorUndefined = 'CreatorUndefined',
  BlockNotReadable = 'BlockNotReadable',
  CreatorRequiredForSignature = 'CreatorRequiredForSignature',
  FileNameRequired = 'FileNameRequired',
  FileNameEmpty = 'FileNameEmpty',
  FileNameWhitespace = 'FileNameWhitespace',
  FileNameInvalidChar = 'FileNameInvalidChar',
  FileNameControlChars = 'FileNameControlChars',
  FileNamePathTraversal = 'FileNamePathTraversal',
  MimeTypeRequired = 'MimeTypeRequired',
  MimeTypeEmpty = 'MimeTypeEmpty',
  MimeTypeWhitespace = 'MimeTypeWhitespace',
  MimeTypeLowercase = 'MimeTypeLowercase',
  MimeTypeInvalidFormat = 'MimeTypeInvalidFormat',
  InvalidBlockSize = 'InvalidBlockSize',
  MetadataSizeExceeded = 'MetadataSizeExceeded',
  MetadataSizeNegative = 'MetadataSizeNegative',
  InvalidMetadataBuffer = 'InvalidMetadataBuffer',
}

export const CblErrorTypes: {
  [key in CblErrorType]: StringNames;
} = {
  [CblErrorType.CblRequired]: StringNames.Error_CblErrorCblRequired,
  [CblErrorType.WhitenedBlockFunctionRequired]:
    StringNames.Error_CblErrorWhitenedBlockFunctionRequired,
  [CblErrorType.FailedToLoadBlock]: StringNames.Error_CblErrorFailedToLoadBlock,
  [CblErrorType.ExpectedEncryptedDataBlock]:
    StringNames.Error_CblErrorExpectedEncryptedDataBlock,
  [CblErrorType.ExpectedOwnedDataBlock]:
    StringNames.Error_CblErrorExpectedOwnedDataBlock,
  [CblErrorType.InvalidStructure]: StringNames.Error_CblErrorInvalidStructure,
  [CblErrorType.CreatorUndefined]: StringNames.Error_CblErrorCreatorUndefined,
  [CblErrorType.BlockNotReadable]: StringNames.Error_CblErrorBlockNotReadable,
  [CblErrorType.CreatorRequiredForSignature]:
    StringNames.Error_CblErrorCreatorRequiredForSignature,
  [CblErrorType.FileNameRequired]: StringNames.Error_CblErrorFileNameRequired,
  [CblErrorType.FileNameEmpty]: StringNames.Error_CblErrorFileNameEmpty,
  [CblErrorType.FileNameWhitespace]:
    StringNames.Error_CblErrorFileNameWhitespace,
  [CblErrorType.FileNameInvalidChar]:
    StringNames.Error_CblErrorFileNameInvalidChar,
  [CblErrorType.FileNameControlChars]:
    StringNames.Error_CblErrorFileNameControlChars,
  [CblErrorType.FileNamePathTraversal]:
    StringNames.Error_CblErrorFileNamePathTraversal,
  [CblErrorType.MimeTypeRequired]: StringNames.Error_CblErrorMimeTypeRequired,
  [CblErrorType.MimeTypeEmpty]: StringNames.Error_CblErrorMimeTypeEmpty,
  [CblErrorType.MimeTypeWhitespace]:
    StringNames.Error_CblErrorMimeTypeWhitespace,
  [CblErrorType.MimeTypeLowercase]: StringNames.Error_CblErrorMimeTypeLowercase,
  [CblErrorType.MimeTypeInvalidFormat]:
    StringNames.Error_CblErrorMimeTypeInvalidFormat,
  [CblErrorType.InvalidBlockSize]: StringNames.Error_CblErrorInvalidBlockSize,
  [CblErrorType.MetadataSizeExceeded]:
    StringNames.Error_CblErrorMetadataSizeExceeded,
  [CblErrorType.MetadataSizeNegative]:
    StringNames.Error_CblErrorMetadataSizeNegative,
  [CblErrorType.InvalidMetadataBuffer]:
    StringNames.Error_CblErrorInvalidMetadataBuffer,
};
