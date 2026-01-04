import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from '@digitaldefiance/i18n-lib';

export abstract class TypedWithReasonError<
  T extends string | number,
> extends HandleableError {
  public readonly type: T;
  protected abstract get reasonMap(): Record<T, StringNames>;

  constructor(
    reasonTemplate: StringNames,
    type: T,
    otherVars?: Record<string, string | number>,
  ) {
    const reasonMap = (new.target as typeof TypedWithReasonError).prototype
      .reasonMap;
    super(
      new Error(
        translate(reasonTemplate, {
          ...otherVars,
          ...{ REASON: translate(reasonMap[type]) },
        })
      ),
    );
    this.type = type;
  }
}
