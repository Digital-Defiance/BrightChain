import {
  MultiEncryptedErrorType,
  MultiEncryptedErrorTypes,
} from '../enumerations/multiEncryptedErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class MultiEncryptedError extends HandleableError {
  public readonly reason: MultiEncryptedErrorType;
  constructor(reason: MultiEncryptedErrorType, language?: StringLanguages) {
    super(translate(MultiEncryptedErrorTypes[reason], language));
    this.name = 'MultiEncryptedError';
    this.reason = reason;
  }
}
