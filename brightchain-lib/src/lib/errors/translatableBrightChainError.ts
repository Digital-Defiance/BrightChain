import { CoreLanguageCode, TranslatableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../enumerations';
import { BrightChainComponentId } from '../i18n';

export class TranslatableBrightChainError extends TranslatableError {
  constructor(
    public override readonly stringKey: BrightChainStrings,
    public readonly otherVars?: Record<string, string | number>,
    language?: CoreLanguageCode,
  ) {
    super(BrightChainComponentId, stringKey, otherVars, language);
    this.name = 'TranslatableBrightChainError';
    Object.setPrototypeOf(this, TranslatableBrightChainError.prototype);
  }
}
