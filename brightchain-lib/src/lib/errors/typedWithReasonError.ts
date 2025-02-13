import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export abstract class TypedWithReasonError<
  T extends string | number,
> extends HandleableError {
  public readonly type: T;
  protected abstract get reasonMap(): Record<T, StringNames>;

  constructor(
    reasonTemplate: StringNames,
    type: T,
    language?: StringLanguages,
    otherVars?: Record<string, string | number>,
  ) {
    const reasonMap = (new.target as typeof TypedWithReasonError).prototype
      .reasonMap;
    super(
      translate(reasonTemplate, language, {
        ...otherVars,
        ...{ REASON: translate(reasonMap[type], language) },
      }),
    );
    this.type = type;
  }
}
