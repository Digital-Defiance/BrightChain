export enum BlockValidationErrorType {
  ActualDataLengthUnknown = 'ActualDataLengthUnknown',
  AddressCountExceedsCapacity = 'AddressCountExceedsCapacity',
  BlockDataNotBuffer = 'BlockDataNotBuffer',
  BlockSizeNegative = 'BlockSizeNegative',
  CreatorIDMismatch = 'CreatorIDMismatch',
  DataBufferIsTruncated = 'DataBufferIsTruncated',
  DataCannotBeEmpty = 'DataCannotBeEmpty',
  DataLengthExceedsCapacity = 'DataLengthExceedsCapacity',
  DataLengthTooShort = 'DataLengthTooShort',
  DataLengthTooShortForCBLHeader = 'DataLengthTooShortForCBLHeader',
  DataLengthTooShortForEncryptedCBL = 'DataLengthTooShortForEncryptedCBL',
  EphemeralBlockOnlySupportsBufferData = 'EphemeralBlockOnlySupportsBufferData',
  FutureCreationDate = 'FutureCreationDate',
  InvalidAddressLength = 'InvalidAddressLength',
  InvalidAuthTagLength = 'InvalidAuthTagLength',
  InvalidBlockType = 'InvalidBlockType',
  InvalidCBLAddressCount = 'InvalidCBLAddressCount',
  InvalidCBLDataLength = 'InvalidCBLDataLength',
  InvalidDateCreated = 'InvalidDateCreated',
  InvalidEncryptionHeaderLength = 'InvalidEncryptionHeaderLength',
  InvalidEphemeralPublicKeyLength = 'InvalidEphemeralPublicKeyLength',
  InvalidIVLength = 'InvalidIVLength',
  InvalidSignature = 'InvalidSignature',
  InvalidTupleSize = 'InvalidTupleSize',
  MethodMustBeImplementedByDerivedClass = 'MethodMustBeImplementedByDerivedClass',
  NoChecksum = 'NoChecksum',
  OriginalDataLengthNegative = 'OriginalDataLengthNegative',
}
