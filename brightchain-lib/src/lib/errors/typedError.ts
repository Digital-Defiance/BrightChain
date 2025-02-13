import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export abstract class TypedError<
  T extends string | number,
> extends HandleableError {
  public readonly type: T;
  protected abstract get reasonMap(): Record<T, StringNames>;

  constructor(
    type: T,
    language?: StringLanguages,
    otherVars?: Record<string, string | number>,
  ) {
    const reasonMap = (new.target as typeof TypedError).prototype.reasonMap;
    super(translate(reasonMap[type], language, otherVars));
    this.type = type;
  }
}
