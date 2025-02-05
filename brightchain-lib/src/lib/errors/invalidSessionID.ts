import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class InvalidSessionIDError extends HandleableError {
  constructor(language?: StringLanguages) {
    super(translate(StringNames.Error_InvalidSessionID, language));
    this.name = 'InvalidSessionIDError';
  }
}
