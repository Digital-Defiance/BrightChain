import BrightChainStrings from '../enumerations/brightChainStrings';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { TypedError } from './typedError';

export class StoreError extends TypedError<StoreErrorType> {
  public get reasonMap(): Record<StoreErrorType, BrightChainStrings> {
    return {
      [StoreErrorType.StorePathRequired]:
        BrightChainStrings.Error_StoreError_StorePathRequired,
      [StoreErrorType.StorePathNotFound]:
        BrightChainStrings.Error_StoreError_StorePathNotFound,
      [StoreErrorType.KeyNotFound]:
        BrightChainStrings.Error_StoreError_KeyNotFoundTemplate,
      [StoreErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_StoreError_BlockSizeMismatch,
      [StoreErrorType.BlockPathAlreadyExists]:
        BrightChainStrings.Error_StoreError_BlockPathAlreadyExistsTemplate,
      [StoreErrorType.BlockAlreadyExists]:
        BrightChainStrings.Error_StoreError_BlockAlreadyExists,
      [StoreErrorType.BlockFileSizeMismatch]:
        BrightChainStrings.Error_StoreError_BlockFileSizeMismatch,
      [StoreErrorType.BlockValidationFailed]:
        BrightChainStrings.Error_StoreError_BlockValidationFailed,
      [StoreErrorType.NoBlocksProvided]:
        BrightChainStrings.Error_StoreError_NoBlocksProvided,
      [StoreErrorType.InvalidBlockMetadata]:
        BrightChainStrings.Error_StoreError_InvalidBlockMetadataTemplate,
      [StoreErrorType.BlockSizeRequired]:
        BrightChainStrings.Error_StoreError_BlockSizeRequired,
      [StoreErrorType.BlockIdRequired]:
        BrightChainStrings.Error_StoreError_BlockIdRequired,
      [StoreErrorType.InvalidBlockIdTooShort]:
        BrightChainStrings.Error_StoreError_InvalidBlockIdTooShort,
      [StoreErrorType.CannotStoreEphemeralData]:
        BrightChainStrings.Error_StoreError_CannotStoreEphemeralData,
      [StoreErrorType.BlockIdMismatch]:
        BrightChainStrings.Error_StoreError_BlockIdMismatchTemplate,
      [StoreErrorType.BlockDirectoryCreationFailed]:
        BrightChainStrings.Error_StoreError_BlockDirectoryCreationFailedTemplate,
      [StoreErrorType.BlockDeletionFailed]:
        BrightChainStrings.Error_StoreError_BlockDeletionFailedTemplate,
      [StoreErrorType.NotImplemented]:
        BrightChainStrings.Error_StoreError_NotImplemented,
      [StoreErrorType.InsufficientRandomBlocks]:
        BrightChainStrings.Error_StoreError_InsufficientRandomBlocksTemplate,
    };
  }
  public readonly params?: { [key: string]: string | number };
  constructor(
    type: StoreErrorType,
    language?: string,
    params?: { [key: string]: string | number },
  ) {
    super(type, language, params);
    this.name = 'StoreError';
    this.params = params;
  }
}
