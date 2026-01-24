import { StoreErrorType } from '../enumerations/storeErrorType';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class StoreError extends TypedError<StoreErrorType> {
  public get reasonMap(): Record<StoreErrorType, BrightChainStrings> {
    return {
      [StoreErrorType.StorePathRequired]:
        BrightChainStrings.Error_StoreErrorStorePathRequired,
      [StoreErrorType.StorePathNotFound]:
        BrightChainStrings.Error_StoreErrorStorePathNotFound,
      [StoreErrorType.KeyNotFound]:
        BrightChainStrings.Error_StoreErrorKeyNotFoundTemplate,
      [StoreErrorType.BlockSizeMismatch]:
        BrightChainStrings.Error_StoreErrorBlockSizeMismatch,
      [StoreErrorType.BlockPathAlreadyExists]:
        BrightChainStrings.Error_StoreErrorBlockPathAlreadyExistsTemplate,
      [StoreErrorType.BlockAlreadyExists]:
        BrightChainStrings.Error_StoreErrorBlockAlreadyExists,
      [StoreErrorType.BlockFileSizeMismatch]:
        BrightChainStrings.Error_StoreErrorBlockFileSizeMismatch,
      [StoreErrorType.BlockValidationFailed]:
        BrightChainStrings.Error_StoreErrorBlockValidationFailed,
      [StoreErrorType.NoBlocksProvided]:
        BrightChainStrings.Error_StoreErrorNoBlocksProvided,
      [StoreErrorType.InvalidBlockMetadata]:
        BrightChainStrings.Error_StoreErrorInvalidBlockMetadataTemplate,
      [StoreErrorType.BlockSizeRequired]:
        BrightChainStrings.Error_StoreErrorBlockSizeRequired,
      [StoreErrorType.BlockIdRequired]:
        BrightChainStrings.Error_StoreErrorBlockIdRequired,
      [StoreErrorType.InvalidBlockIdTooShort]:
        BrightChainStrings.Error_StoreErrorInvalidBlockIdTooShort,
      [StoreErrorType.CannotStoreEphemeralData]:
        BrightChainStrings.Error_StoreErrorCannotStoreEphemeralData,
      [StoreErrorType.BlockIdMismatch]:
        BrightChainStrings.Error_StoreErrorBlockIdMismatchTemplate,
      [StoreErrorType.BlockDirectoryCreationFailed]:
        BrightChainStrings.Error_StoreErrorBlockDirectoryCreationFailedTemplate,
      [StoreErrorType.BlockDeletionFailed]:
        BrightChainStrings.Error_StoreErrorBlockDeletionFailedTemplate,
      [StoreErrorType.NotImplemented]:
        BrightChainStrings.Error_StoreErrorNotImplemented,
      [StoreErrorType.InsufficientRandomBlocks]:
        BrightChainStrings.Error_StoreErrorInsufficientRandomBlocksTemplate,
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
