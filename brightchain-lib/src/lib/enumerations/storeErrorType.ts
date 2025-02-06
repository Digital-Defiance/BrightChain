import { StringNames } from './stringNames';

export enum StoreErrorType {
  KeyNotFound = 'KeyNotFound',
  StorePathRequired = 'StorePathRequired',
  BlockSizeRequired = 'BlockSizeRequired',
  BlockIdRequired = 'BlockIdRequired',
  InvalidBlockIdTooShort = 'InvalidBlockIdTooShort',
  BlockFileSizeMismatch = 'BlockFileSizeMismatch',
  BlockValidationFailed = 'BlockValidationFailed',
  BlockPathAlreadyExists = 'BlockPathAlreadyExists',
  NoBlocksProvided = 'NoBlocksProvided',
  CannotStoreEphemeralData = 'CannotStoreEphemeralData',
  BlockIdMismatch = 'BlockIdMismatch',
  BlockSizeMismatch = 'BlockSizeMismatch',
  InvalidBlockMetadata = 'InvalidBlockMetadata',
  BlockDirectoryCreationFailed = 'BlockDirectoryCreationFailed',
}

export const StoreErrorTypes: {
  [key in StoreErrorType]: StringNames;
} = {
  [StoreErrorType.KeyNotFound]: StringNames.Error_StoreErrorKeyNotFoundTemplate,
  [StoreErrorType.StorePathRequired]:
    StringNames.Error_StoreErrorStorePathRequired,
  [StoreErrorType.BlockSizeRequired]:
    StringNames.Error_StoreErrorBlockSizeRequired,
  [StoreErrorType.BlockIdRequired]: StringNames.Error_StoreErrorBlockIdRequired,
  [StoreErrorType.InvalidBlockIdTooShort]:
    StringNames.Error_StoreErrorInvalidBlockIdTooShort,
  [StoreErrorType.BlockFileSizeMismatch]:
    StringNames.Error_StoreErrorBlockFileSizeMismatch,
  [StoreErrorType.BlockValidationFailed]:
    StringNames.Error_StoreErrorBlockValidationFailed,
  [StoreErrorType.BlockPathAlreadyExists]:
    StringNames.Error_StoreErrorBlockPathAlreadyExistsTemplate,
  [StoreErrorType.NoBlocksProvided]:
    StringNames.Error_StoreErrorNoBlocksProvided,
  [StoreErrorType.CannotStoreEphemeralData]:
    StringNames.Error_StoreErrorCannotStoreEphemeralData,
  [StoreErrorType.BlockIdMismatch]:
    StringNames.Error_StoreErrorBlockIdMismatchTemplate,
  [StoreErrorType.BlockSizeMismatch]:
    StringNames.Error_StoreErrorBlockSizeMismatch,
  [StoreErrorType.InvalidBlockMetadata]:
    StringNames.Error_StoreErrorInvalidBlockMetadataTemplate,
  [StoreErrorType.BlockDirectoryCreationFailed]:
    StringNames.Error_StoreErrorBlockDirectoryCreationFailedTemplate,
};
