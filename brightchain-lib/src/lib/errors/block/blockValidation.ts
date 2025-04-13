import BlockType from '../../enumerations/blockType';
import { BlockValidationErrorType } from '../../enumerations/blockValidationErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { TranslatableEnumType } from '../../enumerations/translatableEnum';
import { translate } from '../../i18n';
import { TypedWithReasonError } from '../typedWithReasonError';

export class BlockValidationError extends TypedWithReasonError<BlockValidationErrorType> {
  public readonly blockType?: BlockType;
  public readonly addressLength?: {
    index: number;
    length: number;
    expectedLength: number;
  };
  public get reasonMap(): Record<BlockValidationErrorType, StringNames> {
    return {
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
      [BlockValidationErrorType.DataCannotBeEmpty]:
        StringNames.Error_BlockValidationErrorDataCannotBeEmpty,
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
      [BlockValidationErrorType.InvalidRecipientCount]:
        StringNames.Error_BlockValidationErrorInvalidRecipientCount,
      [BlockValidationErrorType.InvalidRecipientIds]:
        StringNames.Error_BlockValidationErrorInvalidRecipientIds,
      [BlockValidationErrorType.InvalidEncryptionType]:
        StringNames.Error_BlockValidationErrorInvalidEncryptionType,
      [BlockValidationErrorType.InvalidCreator]:
        StringNames.Error_BlockValidationErrorInvalidCreator,
      [BlockValidationErrorType.EncryptionRecipientNotFoundInRecipients]:
        StringNames.Error_BlockValidationErrorEncryptionRecipientNotFoundInRecipients,
      [BlockValidationErrorType.EncryptionRecipientHasNoPrivateKey]:
        StringNames.Error_BlockValidationErrorEncryptionRecipientHasNoPrivateKey,
      [BlockValidationErrorType.InvalidRecipientKeys]:
        StringNames.Error_BlockValidationErrorInvalidRecipientKeys,
    };
  }
  constructor(
    type: BlockValidationErrorType,
    blockType?: BlockType,
    addressLength?: { index: number; length: number; expectedLength: number },
    language?: StringLanguages,
  ) {
    super(StringNames.Error_BlockValidationErrorTemplate, type, {
      ...(blockType
        ? {
            TYPE: 'BlockType'
          }
        : {}),
      ...(addressLength
        ? {
            INDEX: addressLength.index,
            LENGTH: addressLength.length,
            EXPECTED_LENGTH: addressLength.expectedLength
          }
        : {})
    });
    this.name = 'BlockValidationError';
    this.blockType = blockType;
    this.addressLength = addressLength;
  }
}
