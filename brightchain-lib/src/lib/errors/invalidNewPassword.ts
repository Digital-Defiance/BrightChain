import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class InvalidNewPasswordError extends HandleableError {
  constructor(language?: StringLanguages, statusCode = 422) {
    super(
      translate(
        StringNames.Validation_PasswordRegexErrorTemplate,
        undefined,
        language,
      ),
      {
        statusCode,
      },
    );
    this.name = 'InvalidNewPasswordError';
  }
}
