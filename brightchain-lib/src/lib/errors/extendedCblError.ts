import { BlockSize } from '../enumerations/blockSize';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { TypedError } from './typedError';

export class ExtendedCblError extends TypedError<ExtendedCblErrorType> {
  public readonly blockSize?: BlockSize;
  public readonly dataSize?: number;
  public readonly error?: string;
  public get reasonMap(): Record<ExtendedCblErrorType, BrightChainStringKey> {
    return {
      [ExtendedCblErrorType.CreatorUndefined]:
        BrightChainStrings.Error_CblError_CreatorUndefined,
      [ExtendedCblErrorType.BlockNotReadable]:
        BrightChainStrings.Error_CblError_BlockNotReadable,
      [ExtendedCblErrorType.CreatorRequiredForSignature]:
        BrightChainStrings.Error_CblError_CreatorRequiredForSignature,
      [ExtendedCblErrorType.FileNameRequired]:
        BrightChainStrings.Error_CblError_FileNameRequired,
      [ExtendedCblErrorType.FileNameEmpty]:
        BrightChainStrings.Error_CblError_FileNameEmpty,
      [ExtendedCblErrorType.FileNameWhitespace]:
        BrightChainStrings.Error_CblError_FileNameWhitespace,
      [ExtendedCblErrorType.FileNameInvalidChar]:
        BrightChainStrings.Error_CblError_FileNameInvalidChar,
      [ExtendedCblErrorType.FileNameControlChars]:
        BrightChainStrings.Error_CblError_FileNameControlChars,
      [ExtendedCblErrorType.FileNamePathTraversal]:
        BrightChainStrings.Error_CblError_FileNamePathTraversal,
      [ExtendedCblErrorType.MimeTypeRequired]:
        BrightChainStrings.Error_CblError_MimeTypeRequired,
      [ExtendedCblErrorType.MimeTypeEmpty]:
        BrightChainStrings.Error_CblError_MimeTypeEmpty,
      [ExtendedCblErrorType.MimeTypeWhitespace]:
        BrightChainStrings.Error_CblError_MimeTypeWhitespace,
      [ExtendedCblErrorType.MimeTypeLowercase]:
        BrightChainStrings.Error_CblError_MimeTypeLowercase,
      [ExtendedCblErrorType.MimeTypeInvalidFormat]:
        BrightChainStrings.Error_CblError_MimeTypeInvalidFormat,
      [ExtendedCblErrorType.InvalidBlockSize]:
        BrightChainStrings.Error_CblError_InvalidBlockSize,
      [ExtendedCblErrorType.MetadataSizeExceeded]:
        BrightChainStrings.Error_CblError_MetadataSizeExceeded,
      [ExtendedCblErrorType.MetadataSizeNegative]:
        BrightChainStrings.Error_CblError_MetadataSizeNegative,
      [ExtendedCblErrorType.InvalidMetadataBuffer]:
        BrightChainStrings.Error_CblError_InvalidMetadataBuffer,
      [ExtendedCblErrorType.InvalidStructure]:
        BrightChainStrings.Error_CblError_InvalidStructure,
      [ExtendedCblErrorType.CreationFailed]:
        BrightChainStrings.Error_CblError_CreationFailedTemplate,
      [ExtendedCblErrorType.InsufficientCapacity]:
        BrightChainStrings.Error_CblError_InsufficientCapacityTemplate,
      [ExtendedCblErrorType.NotExtendedCbl]:
        BrightChainStrings.Error_CblError_NotExtendedCbl,
      [ExtendedCblErrorType.FileNameTooLong]:
        BrightChainStrings.Error_CblError_FileNameTooLong,
      [ExtendedCblErrorType.MimeTypeTooLong]:
        BrightChainStrings.Error_CblError_MimeTypeTooLong,
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
