import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class FailedToHydrateError extends HandleableError {
  constructor(message: string, language?: StringLanguages) {
    super(
      translate(StringNames.Error_FailedToHydrateTemplate, {
        ERROR: message,
      }),
    );
  }
}
