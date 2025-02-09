import { StringNames } from './stringNames';

export enum StoreErrorType {
  StorePathRequired = 'StorePathRequired',
  StorePathNotFound = 'StorePathNotFound',
  KeyNotFound = 'KeyNotFound',
  BlockSizeMismatch = 'BlockSizeMismatch',
  BlockPathAlreadyExists = 'BlockPathAlreadyExists',
  BlockFileSizeMismatch = 'BlockFileSizeMismatch',
  BlockValidationFailed = 'BlockValidationFailed',
  NoBlocksProvided = 'NoBlocksProvided',
  InvalidBlockMetadata = 'InvalidBlockMetadata',
  BlockSizeRequired = 'BlockSizeRequired',
  BlockIdRequired = 'BlockIdRequired',
  InvalidBlockIdTooShort = 'InvalidBlockIdTooShort',
  CannotStoreEphemeralData = 'CannotStoreEphemeralData',
  BlockIdMismatch = 'BlockIdMismatch',
  BlockDirectoryCreationFailed = 'BlockDirectoryCreationFailed',
}

export const StoreErrorTypes: Record<StoreErrorType, StringNames> = {
  [StoreErrorType.StorePathRequired]:
    StringNames.Error_StoreErrorStorePathRequired,
  [StoreErrorType.StorePathNotFound]:
    StringNames.Error_StoreErrorStorePathRequired,
  [StoreErrorType.KeyNotFound]: StringNames.Error_StoreErrorKeyNotFoundTemplate,
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
  [StoreErrorType.BlockIdRequired]: StringNames.Error_StoreErrorBlockIdRequired,
  [StoreErrorType.InvalidBlockIdTooShort]:
    StringNames.Error_StoreErrorInvalidBlockIdTooShort,
  [StoreErrorType.CannotStoreEphemeralData]:
    StringNames.Error_StoreErrorCannotStoreEphemeralData,
  [StoreErrorType.BlockIdMismatch]:
    StringNames.Error_StoreErrorBlockIdMismatchTemplate,
  [StoreErrorType.BlockDirectoryCreationFailed]:
    StringNames.Error_StoreErrorBlockDirectoryCreationFailedTemplate,
};
