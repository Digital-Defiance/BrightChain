import { HandleableError } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class BufferError extends HandleableError {
  constructor(
    type: string,
    details?: Record<string, unknown>,
    _language?: string,
  ) {
    super(
      new Error(
        translate(
          BrightChainStrings.Error_BufferError_InvalidBufferTypeTemplate,
          {
            TYPE: type,
            ...details,
          },
        ),
      ),
    );
  }
}
