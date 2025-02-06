import {
  IsolatedKeyErrorType,
  IsolatedKeyErrorTypes,
} from '../enumerations/isolatedKeyErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class IsolatedKeyError extends HandleableError {
  public readonly reason: IsolatedKeyErrorType;
  constructor(reason: IsolatedKeyErrorType, language?: StringLanguages) {
    super(translate(IsolatedKeyErrorTypes[reason], language));
    this.name = 'IsolatedKeyError';
    this.reason = reason;
  }
}
