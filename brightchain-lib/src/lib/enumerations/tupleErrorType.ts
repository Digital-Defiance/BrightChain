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
