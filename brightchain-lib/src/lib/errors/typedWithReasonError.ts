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
    // Translate the reason with the provided variables
    const translatedReason = translate(reasonMap[type], otherVars);
    // Then translate the template with both the reason and the other variables
    const finalMessage = translate(reasonTemplate, {
      ...otherVars,
      REASON: translatedReason,
    });
    super(new Error(finalMessage));
    this.type = type;
  }
}
