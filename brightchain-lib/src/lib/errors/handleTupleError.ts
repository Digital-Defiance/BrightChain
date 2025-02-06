import {
  HandleTupleErrorType,
  HandleTupleErrorTypes,
} from '../enumerations/handleTupleErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class HandleTupleError extends HandleableError {
  public readonly reason: HandleTupleErrorType;
  public readonly tupleSize?: number;
  constructor(
    reason: HandleTupleErrorType,
    tupleSize?: number,
    language?: StringLanguages,
  ) {
    super(
      translate(HandleTupleErrorTypes[reason], language, {
        ...(tupleSize ? { TUPLE_SIZE: tupleSize.toString() } : {}),
      }),
    );
    this.name = 'HandleTupleError';
    this.reason = reason;
    this.tupleSize = tupleSize;
  }
}
