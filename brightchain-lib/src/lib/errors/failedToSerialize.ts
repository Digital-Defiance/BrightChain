import { HandleableError } from '@digitaldefiance/i18n-lib';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';

export class FailedToSerializeError extends HandleableError {
  constructor(message: string, _language?: string) {
    super(
      new Error(
        translate(StringNames.Error_FailedToSerializeTemplate, {
          ERROR: message,
        }),
      ),
    );
    this.name = 'FailedToSerializeError';
  }
}
