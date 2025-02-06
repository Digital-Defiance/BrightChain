import { StringLanguages } from '../enumerations/stringLanguages';
import {
  TupleErrorType,
  TupleErrorTypes,
} from '../enumerations/tupleErrorType';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class TupleError extends HandleableError {
  public readonly type: TupleErrorType;
  constructor(
    type: TupleErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(translate(TupleErrorTypes[type], language, params));
    this.name = 'TupleError';
    this.type = type;
  }
}
