import { BlockSize } from '../enumerations/blockSize';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { TypedError } from './typedError';

export class ExtendedCblError extends TypedError<ExtendedCblErrorType> {
  public readonly blockSize?: BlockSize;
  public readonly dataSize?: number;
  public readonly error?: string;
  public get reasonMap(): Record<ExtendedCblErrorType, BrightChainStrings> {
    return {
      [ExtendedCblErrorType.CreatorUndefined]:
        BrightChainStrings.Error_CblErrorCreatorUndefined,
      [ExtendedCblErrorType.BlockNotReadable]:
        BrightChainStrings.Error_CblErrorBlockNotReadable,
      [ExtendedCblErrorType.CreatorRequiredForSignature]:
        BrightChainStrings.Error_CblErrorCreatorRequiredForSignature,
      [ExtendedCblErrorType.FileNameRequired]:
        BrightChainStrings.Error_CblErrorFileNameRequired,
      [ExtendedCblErrorType.FileNameEmpty]:
        BrightChainStrings.Error_CblErrorFileNameEmpty,
      [ExtendedCblErrorType.FileNameWhitespace]:
        BrightChainStrings.Error_CblErrorFileNameWhitespace,
      [ExtendedCblErrorType.FileNameInvalidChar]:
        BrightChainStrings.Error_CblErrorFileNameInvalidChar,
      [ExtendedCblErrorType.FileNameControlChars]:
        BrightChainStrings.Error_CblErrorFileNameControlChars,
      [ExtendedCblErrorType.FileNamePathTraversal]:
        BrightChainStrings.Error_CblErrorFileNamePathTraversal,
      [ExtendedCblErrorType.MimeTypeRequired]:
        BrightChainStrings.Error_CblErrorMimeTypeRequired,
      [ExtendedCblErrorType.MimeTypeEmpty]:
        BrightChainStrings.Error_CblErrorMimeTypeEmpty,
      [ExtendedCblErrorType.MimeTypeWhitespace]:
        BrightChainStrings.Error_CblErrorMimeTypeWhitespace,
      [ExtendedCblErrorType.MimeTypeLowercase]:
        BrightChainStrings.Error_CblErrorMimeTypeLowercase,
      [ExtendedCblErrorType.MimeTypeInvalidFormat]:
        BrightChainStrings.Error_CblErrorMimeTypeInvalidFormat,
      [ExtendedCblErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_CblErrorInvalidBlockSize,
      [ExtendedCblErrorType.MetadataSizeExceeded]:
        BrightChainStrings.Error_CblErrorMetadataSizeExceeded,
      [ExtendedCblErrorType.MetadataSizeNegative]:
        BrightChainStrings.Error_CblErrorMetadataSizeNegative,
      [ExtendedCblErrorType.InvalidMetadataBuffer]:
        BrightChainStrings.Error_CblErrorInvalidMetadataBuffer,
      [ExtendedCblErrorType.InvalidStructure]:
        BrightChainStrings.Error_CblErrorInvalidStructure,
      [ExtendedCblErrorType.CreationFailed]:
        BrightChainStrings.Error_CblErrorCreationFailedTemplate,
      [ExtendedCblErrorType.InsufficientCapacity]:
        BrightChainStrings.Error_CblErrorInsufficientCapacityTemplate,
      [ExtendedCblErrorType.NotExtendedCbl]:
        BrightChainStrings.Error_CblErrorNotExtendedCbl,
      [ExtendedCblErrorType.FileNameTooLong]:
        BrightChainStrings.Error_CblErrorFileNameTooLong,
      [ExtendedCblErrorType.MimeTypeTooLong]:
        BrightChainStrings.Error_CblErrorMimeTypeTooLong,
    };
  }
  constructor(
    type: ExtendedCblErrorType,
    blockSize?: BlockSize,
    dataSize?: number,
    error?: string,
    _language?: string,
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
