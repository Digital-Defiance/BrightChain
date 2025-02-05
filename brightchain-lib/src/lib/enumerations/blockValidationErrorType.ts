import { StringNames } from './stringNames';

export enum BlockValidationErrorType {
  ActualDataLengthUnknown = 'ActualDataLengthUnknown',
  AddressCountExceedsCapacity = 'AddressCountExceedsCapacity',
  BlockDataNotBuffer = 'BlockDataNotBuffer',
  BlockSizeNegative = 'BlockSizeNegative',
  CreatorIDMismatch = 'CreatorIDMismatch',
  DataBufferIsTruncated = 'DataBufferIsTruncated',
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

export const BlockValidationErrorTypes: {
  [key in BlockValidationErrorType]: StringNames;
} = {
  [BlockValidationErrorType.ActualDataLengthUnknown]:
    StringNames.Error_BlockValidationErrorActualDataLengthUnknown,
  [BlockValidationErrorType.AddressCountExceedsCapacity]:
    StringNames.Error_BlockValidationErrorAddressCountExceedsCapacity,
  [BlockValidationErrorType.BlockDataNotBuffer]:
    StringNames.Error_BlockValidationErrorBlockDataNotBuffer,
  [BlockValidationErrorType.BlockSizeNegative]:
    StringNames.Error_BlockValidationErrorBlockSizeNegative,
  [BlockValidationErrorType.DataBufferIsTruncated]:
    StringNames.Error_BlockValidationErrorDataBufferIsTruncated,
  [BlockValidationErrorType.CreatorIDMismatch]:
    StringNames.Error_BlockValidationErrorCreatorIDMismatch,
  [BlockValidationErrorType.DataLengthExceedsCapacity]:
    StringNames.Error_BlockValidationErrorDataLengthExceedsCapacity,
  [BlockValidationErrorType.DataLengthTooShort]:
    StringNames.Error_BlockValidationErrorDataLengthTooShort,
  [BlockValidationErrorType.DataLengthTooShortForCBLHeader]:
    StringNames.Error_BlockValidationErrorDataLengthTooShortForCBLHeader,
  [BlockValidationErrorType.DataLengthTooShortForEncryptedCBL]:
    StringNames.Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL,
  [BlockValidationErrorType.EphemeralBlockOnlySupportsBufferData]:
    StringNames.Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData,
  [BlockValidationErrorType.FutureCreationDate]:
    StringNames.Error_BlockValidationErrorFutureCreationDate,
  [BlockValidationErrorType.InvalidAddressLength]:
    StringNames.Error_BlockValidationErrorInvalidAddressLengthTemplate,
  [BlockValidationErrorType.InvalidAuthTagLength]:
    StringNames.Error_BlockValidationErrorInvalidAuthTagLength,
  [BlockValidationErrorType.InvalidBlockType]:
    StringNames.Error_BlockValidationErrorInvalidBlockTypeTemplate,
  [BlockValidationErrorType.InvalidCBLAddressCount]:
    StringNames.Error_BlockValidationErrorInvalidCBLAddressCount,
  [BlockValidationErrorType.InvalidCBLDataLength]:
    StringNames.Error_BlockValidationErrorInvalidCBLDataLength,
  [BlockValidationErrorType.InvalidDateCreated]:
    StringNames.Error_BlockValidationErrorInvalidDateCreated,
  [BlockValidationErrorType.InvalidEncryptionHeaderLength]:
    StringNames.Error_BlockValidationErrorInvalidEncryptionHeaderLength,
  [BlockValidationErrorType.InvalidEphemeralPublicKeyLength]:
    StringNames.Error_BlockValidationErrorInvalidEphemeralPublicKeyLength,
  [BlockValidationErrorType.InvalidIVLength]:
    StringNames.Error_BlockValidationErrorInvalidIVLength,
  [BlockValidationErrorType.InvalidSignature]:
    StringNames.Error_BlockValidationErrorInvalidSignature,
  [BlockValidationErrorType.InvalidTupleSize]:
    StringNames.Error_BlockValidationErrorInvalidTupleSizeTemplate,
  [BlockValidationErrorType.MethodMustBeImplementedByDerivedClass]:
    StringNames.Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass,
  [BlockValidationErrorType.NoChecksum]:
    StringNames.Error_BlockValidationErrorNoChecksum,
  [BlockValidationErrorType.OriginalDataLengthNegative]:
    StringNames.Error_BlockValidationErrorOriginalDataLengthNegative,
};
