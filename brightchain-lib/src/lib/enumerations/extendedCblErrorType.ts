import { StringNames } from './stringNames';

export enum ExtendedCblErrorType {
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
  InvalidStructure = 'InvalidStructure',
  CreationFailed = 'CreationFailed',
  InsufficientCapacity = 'InsufficientCapacity',
}

export const ExtendedCblErrorTypes: {
  [key in ExtendedCblErrorType]: StringNames;
} = {
  [ExtendedCblErrorType.CreatorUndefined]:
    StringNames.Error_CblErrorCreatorUndefined,
  [ExtendedCblErrorType.BlockNotReadable]:
    StringNames.Error_CblErrorBlockNotReadable,
  [ExtendedCblErrorType.CreatorRequiredForSignature]:
    StringNames.Error_CblErrorCreatorRequiredForSignature,
  [ExtendedCblErrorType.FileNameRequired]:
    StringNames.Error_CblErrorFileNameRequired,
  [ExtendedCblErrorType.FileNameEmpty]: StringNames.Error_CblErrorFileNameEmpty,
  [ExtendedCblErrorType.FileNameWhitespace]:
    StringNames.Error_CblErrorFileNameWhitespace,
  [ExtendedCblErrorType.FileNameInvalidChar]:
    StringNames.Error_CblErrorFileNameInvalidChar,
  [ExtendedCblErrorType.FileNameControlChars]:
    StringNames.Error_CblErrorFileNameControlChars,
  [ExtendedCblErrorType.FileNamePathTraversal]:
    StringNames.Error_CblErrorFileNamePathTraversal,
  [ExtendedCblErrorType.MimeTypeRequired]:
    StringNames.Error_CblErrorMimeTypeRequired,
  [ExtendedCblErrorType.MimeTypeEmpty]: StringNames.Error_CblErrorMimeTypeEmpty,
  [ExtendedCblErrorType.MimeTypeWhitespace]:
    StringNames.Error_CblErrorMimeTypeWhitespace,
  [ExtendedCblErrorType.MimeTypeLowercase]:
    StringNames.Error_CblErrorMimeTypeLowercase,
  [ExtendedCblErrorType.MimeTypeInvalidFormat]:
    StringNames.Error_CblErrorMimeTypeInvalidFormat,
  [ExtendedCblErrorType.InvalidBlockSize]:
    StringNames.Error_CblErrorInvalidBlockSize,
  [ExtendedCblErrorType.MetadataSizeExceeded]:
    StringNames.Error_CblErrorMetadataSizeExceeded,
  [ExtendedCblErrorType.MetadataSizeNegative]:
    StringNames.Error_CblErrorMetadataSizeNegative,
  [ExtendedCblErrorType.InvalidMetadataBuffer]:
    StringNames.Error_CblErrorInvalidMetadataBuffer,
  [ExtendedCblErrorType.InvalidStructure]:
    StringNames.Error_CblErrorInvalidStructure,
  [ExtendedCblErrorType.CreationFailed]:
    StringNames.Error_CblErrorCreationFailedTemplate,
  [ExtendedCblErrorType.InsufficientCapacity]:
    StringNames.Error_CblErrorInsufficientCapacityTemplate,
};
