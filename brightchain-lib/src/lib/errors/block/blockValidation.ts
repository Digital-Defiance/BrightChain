import BlockType from '../../enumerations/blockType';
import { BlockValidationErrorType } from '../../enumerations/blockValidationErrorType';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockValidationError extends TypedWithReasonError<BlockValidationErrorType> {
  public readonly blockType?: BlockType;
  public readonly addressLength?: {
    index: number;
    length: number;
    expectedLength: number;
  };
  public get reasonMap(): Record<BlockValidationErrorType, BrightChainStrings> {
    return {
      [BlockValidationErrorType.ActualDataLengthUnknown]:
        BrightChainStrings.Error_BlockValidationError_ActualDataLengthUnknown,
      [BlockValidationErrorType.AddressCountExceedsCapacity]:
        BrightChainStrings.Error_BlockValidationError_AddressCountExceedsCapacity,
      [BlockValidationErrorType.BlockDataNotBuffer]:
        BrightChainStrings.Error_BlockValidationError_BlockDataNotBuffer,
      [BlockValidationErrorType.BlockSizeNegative]:
        BrightChainStrings.Error_BlockValidationError_BlockSizeNegative,
      [BlockValidationErrorType.DataBufferIsTruncated]:
        BrightChainStrings.Error_BlockValidationError_DataBufferIsTruncated,
      [BlockValidationErrorType.DataCannotBeEmpty]:
        BrightChainStrings.Error_BlockValidationError_DataCannotBeEmpty,
      [BlockValidationErrorType.CreatorIDMismatch]:
        BrightChainStrings.Error_BlockValidationError_CreatorIDMismatch,
      [BlockValidationErrorType.DataLengthExceedsCapacity]:
        BrightChainStrings.Error_BlockValidationError_DataLengthExceedsCapacity,
      [BlockValidationErrorType.DataLengthTooShort]:
        BrightChainStrings.Error_BlockValidationError_DataLengthTooShort,
      [BlockValidationErrorType.DataLengthTooShortForCBLHeader]:
        BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForCBLHeader,
      [BlockValidationErrorType.DataLengthTooShortForEncryptedCBL]:
        BrightChainStrings.Error_BlockValidationError_DataLengthTooShortForEncryptedCBL,
      [BlockValidationErrorType.EphemeralBlockOnlySupportsBufferData]:
        BrightChainStrings.Error_BlockValidationError_EphemeralBlockOnlySupportsBufferData,
      [BlockValidationErrorType.FutureCreationDate]:
        BrightChainStrings.Error_BlockValidationError_FutureCreationDate,
      [BlockValidationErrorType.InvalidAddressLength]:
        BrightChainStrings.Error_BlockValidationError_InvalidAddressLengthTemplate,
      [BlockValidationErrorType.InvalidAuthTagLength]:
        BrightChainStrings.Error_BlockValidationError_InvalidAuthTagLength,
      [BlockValidationErrorType.InvalidBlockType]:
        BrightChainStrings.Error_BlockValidationError_InvalidBlockTypeTemplate,
      [BlockValidationErrorType.InvalidCBLAddressCount]:
        BrightChainStrings.Error_BlockValidationError_InvalidCBLAddressCount,
      [BlockValidationErrorType.InvalidCBLDataLength]:
        BrightChainStrings.Error_BlockValidationError_InvalidCBLDataLength,
      [BlockValidationErrorType.InvalidDateCreated]:
        BrightChainStrings.Error_BlockValidationError_InvalidDateCreated,
      [BlockValidationErrorType.InvalidEncryptionHeaderLength]:
        BrightChainStrings.Error_BlockValidationError_InvalidEncryptionHeaderLength,
      [BlockValidationErrorType.InvalidEphemeralPublicKeyLength]:
        BrightChainStrings.Error_BlockValidationError_InvalidEphemeralPublicKeyLength,
      [BlockValidationErrorType.InvalidIVLength]:
        BrightChainStrings.Error_BlockValidationError_InvalidIVLength,
      [BlockValidationErrorType.InvalidSignature]:
        BrightChainStrings.Error_BlockValidationError_InvalidSignature,
      [BlockValidationErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_BlockValidationError_InvalidTupleSizeTemplate,
      [BlockValidationErrorType.MethodMustBeImplementedByDerivedClass]:
        BrightChainStrings.Error_BlockValidationError_MethodMustBeImplementedByDerivedClass,
      [BlockValidationErrorType.NoChecksum]:
        BrightChainStrings.Error_BlockValidationError_NoChecksum,
      [BlockValidationErrorType.OriginalDataLengthNegative]:
        BrightChainStrings.Error_BlockValidationError_OriginalDataLengthNegative,
      [BlockValidationErrorType.InvalidRecipientCount]:
        BrightChainStrings.Error_BlockValidationError_InvalidRecipientCount,
      [BlockValidationErrorType.InvalidRecipientIds]:
        BrightChainStrings.Error_BlockValidationError_InvalidRecipientIds,
      [BlockValidationErrorType.InvalidEncryptionType]:
        BrightChainStrings.Error_BlockValidationError_InvalidEncryptionType,
      [BlockValidationErrorType.InvalidCreator]:
        BrightChainStrings.Error_BlockValidationError_InvalidCreator,
      [BlockValidationErrorType.EncryptionRecipientNotFoundInRecipients]:
        BrightChainStrings.Error_BlockValidationError_EncryptionRecipientNotFoundInRecipients,
      [BlockValidationErrorType.EncryptionRecipientHasNoPrivateKey]:
        BrightChainStrings.Error_BlockValidationError_EncryptionRecipientHasNoPrivateKey,
      [BlockValidationErrorType.InvalidRecipientKeys]:
        BrightChainStrings.Error_BlockValidationError_InvalidRecipientKeys,
    };
  }
  constructor(
    type: BlockValidationErrorType,
    blockType?: BlockType,
    addressLength?: { index: number; length: number; expectedLength: number },
    _language?: string,
  ) {
    const vars = {
      ...(blockType !== undefined
        ? {
            TYPE: BlockType[blockType],
          }
        : {}),
      ...(addressLength
        ? {
            INDEX: addressLength.index.toString(),
            LENGTH: addressLength.length.toString(),
            EXPECTED_LENGTH: addressLength.expectedLength.toString(),
          }
        : {}),
    };
    super(BrightChainStrings.Error_BlockValidationError_Template, type, vars);
    this.name = 'BlockValidationError';
    this.blockType = blockType;
    this.addressLength = addressLength;
  }
}
