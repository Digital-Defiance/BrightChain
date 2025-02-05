import {
  BlockMetadataErrorType,
  BlockMetadataErrorTypes,
} from '../../enumerations/blockMetadataErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { translate } from '../../i18n';
import { HandleableError } from '../handleable';

export class BlockMetadataError extends HandleableError {
  public readonly reason: BlockMetadataErrorType;
  constructor(
    reason: BlockMetadataErrorType,
    details?: string,
    language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_BlockMetadataTemplate, language, {
        DETAILS: translate(
          BlockMetadataErrorTypes[reason],
          language,
          details ? { REASON: details } : {},
        ),
      }),
    );
    this.name = 'BlockMetadataError';
    this.reason = reason;
  }
}
