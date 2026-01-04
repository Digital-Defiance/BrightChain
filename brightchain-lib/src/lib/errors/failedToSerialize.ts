import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export class FailedToSerializeError extends HandleableError {
  constructor(message: string, language?: StringLanguages) {
    super(
      new Error(
        translate(StringNames.Error_FailedToSerializeTemplate, {
          ERROR: message,
        })
      ),
    );
    this.name = 'FailedToSerializeError';
  }
}
