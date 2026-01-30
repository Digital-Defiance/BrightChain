import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStringKey } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';
import { HandleableErrorOptions } from '../interfaces/handleableErrorOptions';

export abstract class TypedError<
  T extends string | number,
  K extends string = BrightChainStringKey
> extends HandleableError {
  protected abstract get reasonMap(): Record<T, K>;

  constructor(
    public readonly type: T,
    public readonly language?: string,
    public readonly otherVars?: Record<string, string | number>,
    public readonly options?: HandleableErrorOptions,
  ) {
    // Get the reasonMap from the prototype
    const reasonMap = (new.target as typeof TypedError).prototype.reasonMap;

    // Call super with the translated message
    super(new Error(translate(reasonMap[type], otherVars, language)), options);

    // Set properties
    this.type = type;
    this.name = this.constructor.name;
  }
}
