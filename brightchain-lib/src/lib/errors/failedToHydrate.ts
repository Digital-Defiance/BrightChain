import { HandleableError } from '@digitaldefiance/i18n-lib';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';

export class FailedToHydrateError extends HandleableError {
  constructor(message: string, _language?: string) {
    super(
      new Error(
        translate(StringNames.Error_FailedToHydrateTemplate, {
          ERROR: message,
        }),
      ),
    );
  }
}
