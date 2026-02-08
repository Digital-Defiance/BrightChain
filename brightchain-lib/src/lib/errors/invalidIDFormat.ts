import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class InvalidIDFormatError extends HandleableError {
  constructor(_language?: string) {
    super(new Error(translate(BrightChainStrings.Error_ID_InvalidFormat)));
  }
}
