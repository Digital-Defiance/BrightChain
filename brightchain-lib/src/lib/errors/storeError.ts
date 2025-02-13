import { StoreErrorType } from '../enumerations/storeErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class StoreError extends TypedError<StoreErrorType> {
  public get reasonMap(): Record<StoreErrorType, StringNames> {
    return {
      [StoreErrorType.StorePathRequired]:
        StringNames.Error_StoreErrorStorePathRequired,
      [StoreErrorType.StorePathNotFound]:
        StringNames.Error_StoreErrorStorePathNotFound,
      [StoreErrorType.KeyNotFound]:
        StringNames.Error_StoreErrorKeyNotFoundTemplate,
      [StoreErrorType.BlockSizeMismatch]:
        StringNames.Error_StoreErrorBlockSizeMismatch,
      [StoreErrorType.BlockPathAlreadyExists]:
        StringNames.Error_StoreErrorBlockPathAlreadyExistsTemplate,
      [StoreErrorType.BlockFileSizeMismatch]:
        StringNames.Error_StoreErrorBlockFileSizeMismatch,
      [StoreErrorType.BlockValidationFailed]:
        StringNames.Error_StoreErrorBlockValidationFailed,
      [StoreErrorType.NoBlocksProvided]:
        StringNames.Error_StoreErrorNoBlocksProvided,
      [StoreErrorType.InvalidBlockMetadata]:
        StringNames.Error_StoreErrorInvalidBlockMetadataTemplate,
      [StoreErrorType.BlockSizeRequired]:
        StringNames.Error_StoreErrorBlockSizeRequired,
      [StoreErrorType.BlockIdRequired]:
        StringNames.Error_StoreErrorBlockIdRequired,
      [StoreErrorType.InvalidBlockIdTooShort]:
        StringNames.Error_StoreErrorInvalidBlockIdTooShort,
      [StoreErrorType.CannotStoreEphemeralData]:
        StringNames.Error_StoreErrorCannotStoreEphemeralData,
      [StoreErrorType.BlockIdMismatch]:
        StringNames.Error_StoreErrorBlockIdMismatchTemplate,
      [StoreErrorType.BlockDirectoryCreationFailed]:
        StringNames.Error_StoreErrorBlockDirectoryCreationFailedTemplate,
      [StoreErrorType.BlockDeletionFailed]:
        StringNames.Error_StoreErrorBlockDeletionFailedTemplate,
    };
  }
  public readonly params?: { [key: string]: string | number };
  constructor(
    type: StoreErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(type, language, params);
    this.name = 'StoreError';
    this.params = params;
  }
}
