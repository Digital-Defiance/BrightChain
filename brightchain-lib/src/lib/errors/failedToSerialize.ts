import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class FailedToSerializeError extends HandleableError {
  constructor(message: string, _language?: string) {
    super(
      new Error(
        translate(
          BrightChainStrings.Error_Serialization_FailedToSerializeTemplate,
          {
            ERROR: message,
          },
        ),
      ),
    );
    this.name = 'FailedToSerializeError';
  }
}
