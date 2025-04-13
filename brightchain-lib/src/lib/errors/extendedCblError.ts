import { BlockSize } from '../enumerations/blockSize';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class ExtendedCblError extends TypedError<ExtendedCblErrorType> {
  public readonly blockSize?: BlockSize;
  public readonly dataSize?: number;
  public readonly error?: string;
  public get reasonMap(): Record<ExtendedCblErrorType, StringNames> {
    return {
      [ExtendedCblErrorType.CreatorUndefined]:
        StringNames.Error_CblErrorCreatorUndefined,
      [ExtendedCblErrorType.BlockNotReadable]:
        StringNames.Error_CblErrorBlockNotReadable,
      [ExtendedCblErrorType.CreatorRequiredForSignature]:
        StringNames.Error_CblErrorCreatorRequiredForSignature,
      [ExtendedCblErrorType.FileNameRequired]:
        StringNames.Error_CblErrorFileNameRequired,
      [ExtendedCblErrorType.FileNameEmpty]:
        StringNames.Error_CblErrorFileNameEmpty,
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
      [ExtendedCblErrorType.MimeTypeEmpty]:
        StringNames.Error_CblErrorMimeTypeEmpty,
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
      [ExtendedCblErrorType.NotExtendedCbl]:
        StringNames.Error_CblErrorNotExtendedCbl,
      [ExtendedCblErrorType.FileNameTooLong]:
        StringNames.Error_CblErrorFileNameTooLong,
      [ExtendedCblErrorType.MimeTypeTooLong]:
        StringNames.Error_CblErrorMimeTypeTooLong,
    };
  }
  constructor(
    type: ExtendedCblErrorType,
    blockSize?: BlockSize,
    dataSize?: number,
    error?: string,
    language?: StringLanguages,
  ) {
    super(type, undefined, {
      ...(blockSize ? { BLOCK_SIZE: blockSize as number } : {}),
      ...(dataSize ? { DATA_SIZE: dataSize } : {}),
      ...(error ? { ERROR: error } : {}),
    });
    this.name = 'ExtendedCblError';
    this.blockSize = blockSize;
    this.dataSize = dataSize;
  }
}
