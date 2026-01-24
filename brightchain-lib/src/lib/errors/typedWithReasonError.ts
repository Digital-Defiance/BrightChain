import { HandleableError } from '@digitaldefiance/i18n-lib';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export abstract class TypedWithReasonError<
  T extends string | number,
> extends HandleableError {
  public readonly type: T;
  protected abstract get reasonMap(): Record<T, BrightChainStrings>;

  constructor(
    reasonTemplate: BrightChainStrings,
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
        }),
      ),
    );
    this.type = type;
  }
}
