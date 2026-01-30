import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class FailedToHydrateError extends HandleableError {
  constructor(message: string, _language?: string) {
    super(
      new Error(
        translate(BrightChainStrings.Error_Hydration_FailedToHydrateTemplate, {
          ERROR: message,
        }),
      ),
    );
  }
}
