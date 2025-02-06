import { StringNames } from './stringNames';

export enum TupleErrorType {
  InvalidTupleSize = 'InvalidTupleSize',
  BlockSizeMismatch = 'BlockSizeMismatch',
  NoBlocksToXor = 'NoBlocksToXor',
  InvalidBlockCount = 'InvalidBlockCount',
  InvalidBlockType = 'InvalidBlockType',
  InvalidSourceLength = 'InvalidSourceLength',
  RandomBlockGenerationFailed = 'RandomBlockGenerationFailed',
  WhiteningBlockGenerationFailed = 'WhiteningBlockGenerationFailed',
  MissingParameters = 'MissingParameters',
  XorOperationFailed = 'XorOperationFailed',
  DataStreamProcessingFailed = 'DataStreamProcessingFailed',
  EncryptedDataStreamProcessingFailed = 'EncryptedDataStreamProcessingFailed',
}

export const TupleErrorTypes: {
  [key in TupleErrorType]: StringNames;
} = {
  [TupleErrorType.InvalidTupleSize]:
    StringNames.Error_TupleErrorInvalidTupleSize,
  [TupleErrorType.BlockSizeMismatch]:
    StringNames.Error_TupleErrorBlockSizeMismatch,
  [TupleErrorType.NoBlocksToXor]: StringNames.Error_TupleErrorNoBlocksToXor,
  [TupleErrorType.InvalidBlockCount]:
    StringNames.Error_TupleErrorInvalidBlockCount,
  [TupleErrorType.InvalidBlockType]:
    StringNames.Error_TupleErrorInvalidBlockType,
  [TupleErrorType.InvalidSourceLength]:
    StringNames.Error_TupleErrorInvalidSourceLength,
  [TupleErrorType.RandomBlockGenerationFailed]:
    StringNames.Error_TupleErrorRandomBlockGenerationFailed,
  [TupleErrorType.WhiteningBlockGenerationFailed]:
    StringNames.Error_TupleErrorWhiteningBlockGenerationFailed,
  [TupleErrorType.MissingParameters]:
    StringNames.Error_TupleErrorMissingParameters,
  [TupleErrorType.XorOperationFailed]:
    StringNames.Error_TupleErrorXorOperationFailedTemplate,
  [TupleErrorType.DataStreamProcessingFailed]:
    StringNames.Error_TupleErrorDataStreamProcessingFailedTemplate,
  [TupleErrorType.EncryptedDataStreamProcessingFailed]:
    StringNames.Error_TupleErrorEncryptedDataStreamProcessingFailedTemplate,
};
