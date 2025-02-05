import {
  InvalidEmailErrorType,
  InvalidEmailErrorTypes,
} from '../enumerations/invalidEmailType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class InvalidEmailError extends HandleableError {
  public readonly reason: InvalidEmailErrorType;
  constructor(reason: InvalidEmailErrorType, language?: StringLanguages) {
    super(translate(InvalidEmailErrorTypes[reason], language), {
      statusCode: 422,
    });
    this.name = 'InvalidEmailError';
    this.reason = reason;
  }
}
