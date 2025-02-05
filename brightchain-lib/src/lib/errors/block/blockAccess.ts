import {
  BlockAccessErrorType,
  BlockAccessErrorTypes,
} from '../../enumerations/blockAccessErrorType';
import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { translate } from '../../i18n';
import { HandleableError } from '../handleable';

export class BlockAccessError extends HandleableError {
  public readonly reason: BlockAccessErrorType;
  public readonly file?: string;
  constructor(
    reason: BlockAccessErrorType,
    file?: string,
    language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_BlockAccessTemplate, language, {
        REASON: translate(
          BlockAccessErrorTypes[reason],
          language,
          file ? { FILE: file } : {},
        ),
      }),
    );
    this.name = 'BlockAccessError';
    this.reason = reason;
    this.file = file;
  }
}
