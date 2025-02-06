import { StringLanguages } from '../enumerations/stringLanguages';
import {
  SystemKeyringErrorType,
  SystemKeyringErrorTypes,
} from '../enumerations/systemKeyringErrorType';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class SystemKeyringError extends HandleableError {
  public readonly reason: SystemKeyringErrorType;

  constructor(
    reason: SystemKeyringErrorType,
    keyId?: string,
    language?: StringLanguages,
  ) {
    super(
      translate(SystemKeyringErrorTypes[reason], language, {
        ...(keyId ? { KEY: keyId } : {}),
      }),
    );
    this.name = 'SystemKeyringError';
    this.reason = reason;
  }
}
