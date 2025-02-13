export enum BlockCapacityErrorType {
  InvalidBlockSize = 'Invalid block size',
  InvalidBlockType = 'Invalid block type',
  InvalidRecipientCount = 'Invalid recipient count',
  InvalidExtendedCblData = 'Invalid extended CBL data',
  InvalidFileName = 'Invalid file name',
  InvalidMimeType = 'Invalid mime type',
  CapacityExceeded = 'Block capacity exceeded',
  InvalidEncryptionType = 'Invalid encryption type for this block type', // Added
}
