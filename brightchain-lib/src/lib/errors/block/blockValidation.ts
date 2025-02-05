import BlockType from '../../enumerations/blockType';
import {
  BlockValidationErrorType,
  BlockValidationErrorTypes,
} from '../../enumerations/blockValidationErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { TranslatableEnumType } from '../../enumerations/translatableEnum';
import { translate, translateEnum } from '../../i18n';
import { HandleableError } from '../handleable';

export class BlockValidationError extends HandleableError {
  public readonly reason: BlockValidationErrorType;
  public readonly blockType?: BlockType;
  public readonly addressLength?: {
    index: number;
    length: number;
    expectedLength: number;
  };
  constructor(
    reason: BlockValidationErrorType,
    blockType?: BlockType,
    addressLength?: { index: number; length: number; expectedLength: number },
    language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_BlockValidationTemplate, language, {
        REASON: translate(BlockValidationErrorTypes[reason], language),
        ...(blockType
          ? {
              TYPE: translateEnum({
                type: TranslatableEnumType.BlockType,
                value: blockType,
              }),
            }
          : {}),
        ...(addressLength
          ? {
              INDEX: addressLength.index,
              LENGTH: addressLength.length,
              EXPECTED_LENGTH: addressLength.expectedLength,
            }
          : {}),
      }),
    );
    this.name = 'BlockValidationError';
    this.reason = reason;
    this.blockType = blockType;
    this.addressLength = addressLength;
  }
}
