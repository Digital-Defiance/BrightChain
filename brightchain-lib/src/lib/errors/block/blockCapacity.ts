import { StringLanguages } from '../../enumerations/stringLanguages';
import { StringNames } from '../../enumerations/stringNames';
import { translate } from '../../i18n';
import { HandleableError } from '../handleable';

export class BlockCapacityError extends HandleableError {
  constructor(details: StringNames, language?: StringLanguages) {
    super(
      translate(StringNames.Error_BlockCapacityTemplate, language, {
        DETAILS: details,
      }),
    );
    this.name = 'BlockCapacityError';
  }
}
