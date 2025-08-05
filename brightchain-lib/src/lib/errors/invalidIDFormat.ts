import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class InvalidIDFormatError extends HandleableError {
  constructor(language?: StringLanguages) {
    super(translate(StringNames.Error_InvalidIDFormat, language));
    this.name = 'InvalidIDFormatError';
  }
}
