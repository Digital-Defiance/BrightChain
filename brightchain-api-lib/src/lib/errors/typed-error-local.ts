// Local TypedError to avoid circular dependencies with main lib
// This preserves the StringName translation system
import { BrightChainStringKey, translate } from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';

export abstract class TypedError<
  T extends string | number,
  K extends string = BrightChainStringKey,
> extends Error {
  protected abstract get reasonMap(): Record<T, K>;

  constructor(
    public readonly type: T,
    public readonly language?: CoreLanguageCode,
    public readonly otherVars?: Record<string, string | number>,
  ) {
    // Get the reasonMap from the prototype
    const reasonMap = (new.target as typeof TypedError).prototype.reasonMap;

    // Call super with the translated message
    super(translate(reasonMap[type], otherVars, language));

    // Set properties
    this.type = type;
    this.name = this.constructor.name;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
