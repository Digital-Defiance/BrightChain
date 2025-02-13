import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class BufferError extends HandleableError {
  constructor(
    type: string,
    details?: Record<string, unknown>,
    language?: StringLanguages,
  ) {
    super(
      translate(
        StringNames.Error_BufferErrorInvalidBufferTypeTemplate,
        language,
        {
          TYPE: type,
          ...details,
        },
      ),
    );
  }
}
