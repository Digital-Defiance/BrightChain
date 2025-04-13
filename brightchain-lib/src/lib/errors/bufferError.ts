import { HandleableError } from '@digitaldefiance/i18n-lib';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';

export class BufferError extends HandleableError {
  constructor(
    type: string,
    details?: Record<string, unknown>,
    _language?: StringLanguages,
  ) {
    super(
      new Error(
        translate(StringNames.Error_BufferErrorInvalidBufferTypeTemplate, {
          TYPE: type,
          ...details,
        }),
      ),
    );
  }
}
