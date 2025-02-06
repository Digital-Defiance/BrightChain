import {
  Pbkdf2ErrorType,
  Pbkdf2ErrorTypes,
} from '../enumerations/pbkdf2ErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class Pbkdf2Error extends HandleableError {
  public readonly reason: Pbkdf2ErrorType;

  constructor(reason: Pbkdf2ErrorType, language?: StringLanguages) {
    super(translate(Pbkdf2ErrorTypes[reason], language));
    this.name = 'Pbkdf2Error';
    this.reason = reason;
  }
}
