import {
  SecureStorageErrorType,
  SecureStorageErrorTypes,
} from '../enumerations/secureStorageErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class SecureStorageError extends HandleableError {
  public readonly reason: SecureStorageErrorType;
  constructor(reason: SecureStorageErrorType, language?: StringLanguages) {
    super(translate(SecureStorageErrorTypes[reason], language));
    this.reason = reason;
    this.name = 'SecureStorageError';
  }
}
