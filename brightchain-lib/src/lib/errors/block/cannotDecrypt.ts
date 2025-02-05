import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { translate } from '../../i18n';
import { HandleableError } from '../handleable';

export class CannotDecryptBlockError extends HandleableError {
  constructor(language?: StringLanguages) {
    super(translate(StringNames.Error_BlockCannotBeDecrypted, language));
    this.name = 'CannotDecryptBlockError';
  }
}
