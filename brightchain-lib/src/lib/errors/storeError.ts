import {
  StoreErrorType,
  StoreErrorTypes,
} from '../enumerations/storeErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class StoreError extends HandleableError {
  public readonly type: StoreErrorType;
  public readonly params?: { [key: string]: string | number };
  constructor(
    type: StoreErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(translate(StoreErrorTypes[type], language, params));
    this.name = 'StoreError';
    this.type = type;
    this.params = params;
  }
}
