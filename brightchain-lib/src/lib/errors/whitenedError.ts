import { StringLanguages } from '../enumerations/stringLanguages';
import {
  WhitenedErrorType,
  WhitenedErrorTypes,
} from '../enumerations/whitenedErrorType';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class WhitenedError extends HandleableError {
  public readonly reason: WhitenedErrorType;
  constructor(reason: WhitenedErrorType, language?: StringLanguages) {
    super(translate(WhitenedErrorTypes[reason], language));
    this.name = 'WhitenedError';
    this.reason = reason;
  }
}
