import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { translate } from '../../i18n';

export class CannotEncryptBlockError extends HandleableError {
  constructor(_language?: string) {
    super(
      new Error(translate(BrightChainStrings.Error_BlockCannotBeEncrypted)),
    );
  }
}
