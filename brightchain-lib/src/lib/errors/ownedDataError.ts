import {
  OwnedDataErrorType,
  OwnedDataErrorTypes,
} from '../enumerations/ownedDataErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class OwnedDataError extends HandleableError {
  public readonly reason: OwnedDataErrorType;
  constructor(reason: OwnedDataErrorType, language?: StringLanguages) {
    super(translate(OwnedDataErrorTypes[reason], language));
    this.name = 'OwnedDataError';
    this.reason = reason;
  }
}
