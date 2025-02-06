import {
  StreamErrorType,
  StreamErrorTypes,
} from '../enumerations/streamErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class StreamError extends HandleableError {
  public readonly reason: StreamErrorType;

  constructor(
    reason: StreamErrorType,
    language?: StringLanguages,
    templateParams?: Record<string, string>,
  ) {
    super(translate(StreamErrorTypes[reason], language, templateParams));
    this.name = 'StreamError';
    this.reason = reason;
  }
}
