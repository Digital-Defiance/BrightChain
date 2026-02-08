import { CoreLanguageCode, TranslatableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStringKey } from '../enumerations';
import { BrightChainComponentId } from '../i18n';

export class TranslatableBrightChainError extends TranslatableError {
  constructor(
    public override readonly stringKey: BrightChainStringKey,
    public readonly otherVars?: Record<string, string | number>,
    language?: CoreLanguageCode,
  ) {
    super(BrightChainComponentId, stringKey, otherVars, language);
    this.name = 'TranslatableBrightChainError';
    Object.setPrototypeOf(this, TranslatableBrightChainError.prototype);
  }
}
