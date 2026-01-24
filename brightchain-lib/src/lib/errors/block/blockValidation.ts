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
        BrightChainStrings.Error_BlockValidationErrorActualDataLengthUnknown,
      [BlockValidationErrorType.AddressCountExceedsCapacity]:
        BrightChainStrings.Error_BlockValidationErrorAddressCountExceedsCapacity,
      [BlockValidationErrorType.BlockDataNotBuffer]:
        BrightChainStrings.Error_BlockValidationErrorBlockDataNotBuffer,
      [BlockValidationErrorType.BlockSizeNegative]:
        BrightChainStrings.Error_BlockValidationErrorBlockSizeNegative,
      [BlockValidationErrorType.DataBufferIsTruncated]:
        BrightChainStrings.Error_BlockValidationErrorDataBufferIsTruncated,
      [BlockValidationErrorType.DataCannotBeEmpty]:
        BrightChainStrings.Error_BlockValidationErrorDataCannotBeEmpty,
      [BlockValidationErrorType.CreatorIDMismatch]:
        BrightChainStrings.Error_BlockValidationErrorCreatorIDMismatch,
      [BlockValidationErrorType.DataLengthExceedsCapacity]:
        BrightChainStrings.Error_BlockValidationErrorDataLengthExceedsCapacity,
      [BlockValidationErrorType.DataLengthTooShort]:
        BrightChainStrings.Error_BlockValidationErrorDataLengthTooShort,
      [BlockValidationErrorType.DataLengthTooShortForCBLHeader]:
        BrightChainStrings.Error_BlockValidationErrorDataLengthTooShortForCBLHeader,
      [BlockValidationErrorType.DataLengthTooShortForEncryptedCBL]:
        BrightChainStrings.Error_BlockValidationErrorDataLengthTooShortForEncryptedCBL,
      [BlockValidationErrorType.EphemeralBlockOnlySupportsBufferData]:
        BrightChainStrings.Error_BlockValidationErrorEphemeralBlockOnlySupportsBufferData,
      [BlockValidationErrorType.FutureCreationDate]:
        BrightChainStrings.Error_BlockValidationErrorFutureCreationDate,
      [BlockValidationErrorType.InvalidAddressLength]:
        BrightChainStrings.Error_BlockValidationErrorInvalidAddressLengthTemplate,
      [BlockValidationErrorType.InvalidAuthTagLength]:
        BrightChainStrings.Error_BlockValidationErrorInvalidAuthTagLength,
      [BlockValidationErrorType.InvalidBlockType]:
        BrightChainStrings.Error_BlockValidationErrorInvalidBlockTypeTemplate,
      [BlockValidationErrorType.InvalidCBLAddressCount]:
        BrightChainStrings.Error_BlockValidationErrorInvalidCBLAddressCount,
      [BlockValidationErrorType.InvalidCBLDataLength]:
        BrightChainStrings.Error_BlockValidationErrorInvalidCBLDataLength,
      [BlockValidationErrorType.InvalidDateCreated]:
        BrightChainStrings.Error_BlockValidationErrorInvalidDateCreated,
      [BlockValidationErrorType.InvalidEncryptionHeaderLength]:
        BrightChainStrings.Error_BlockValidationErrorInvalidEncryptionHeaderLength,
      [BlockValidationErrorType.InvalidEphemeralPublicKeyLength]:
        BrightChainStrings.Error_BlockValidationErrorInvalidEphemeralPublicKeyLength,
      [BlockValidationErrorType.InvalidIVLength]:
        BrightChainStrings.Error_BlockValidationErrorInvalidIVLength,
      [BlockValidationErrorType.InvalidSignature]:
        BrightChainStrings.Error_BlockValidationErrorInvalidSignature,
      [BlockValidationErrorType.InvalidTupleSize]:
        BrightChainStrings.Error_BlockValidationErrorInvalidTupleSizeTemplate,
      [BlockValidationErrorType.MethodMustBeImplementedByDerivedClass]:
        BrightChainStrings.Error_BlockValidationErrorMethodMustBeImplementedByDerivedClass,
      [BlockValidationErrorType.NoChecksum]:
        BrightChainStrings.Error_BlockValidationErrorNoChecksum,
      [BlockValidationErrorType.OriginalDataLengthNegative]:
        BrightChainStrings.Error_BlockValidationErrorOriginalDataLengthNegative,
      [BlockValidationErrorType.InvalidRecipientCount]:
        BrightChainStrings.Error_BlockValidationErrorInvalidRecipientCount,
      [BlockValidationErrorType.InvalidRecipientIds]:
        BrightChainStrings.Error_BlockValidationErrorInvalidRecipientIds,
      [BlockValidationErrorType.InvalidEncryptionType]:
        BrightChainStrings.Error_BlockValidationErrorInvalidEncryptionType,
      [BlockValidationErrorType.InvalidCreator]:
        BrightChainStrings.Error_BlockValidationErrorInvalidCreator,
      [BlockValidationErrorType.EncryptionRecipientNotFoundInRecipients]:
        BrightChainStrings.Error_BlockValidationErrorEncryptionRecipientNotFoundInRecipients,
      [BlockValidationErrorType.EncryptionRecipientHasNoPrivateKey]:
        BrightChainStrings.Error_BlockValidationErrorEncryptionRecipientHasNoPrivateKey,
      [BlockValidationErrorType.InvalidRecipientKeys]:
        BrightChainStrings.Error_BlockValidationErrorInvalidRecipientKeys,
    };
  }
  constructor(
    type: BlockValidationErrorType,
    blockType?: BlockType,
    addressLength?: { index: number; length: number; expectedLength: number },
    _language?: string,
  ) {
    super(BrightChainStrings.Error_BlockValidationErrorTemplate, type, {
      ...(blockType
        ? {
            TYPE: 'BlockType',
          }
        : {}),
      ...(addressLength
        ? {
            INDEX: addressLength.index,
            LENGTH: addressLength.length,
            EXPECTED_LENGTH: addressLength.expectedLength,
          }
        : {}),
    });
    this.name = 'BlockValidationError';
    this.blockType = blockType;
    this.addressLength = addressLength;
  }
}
