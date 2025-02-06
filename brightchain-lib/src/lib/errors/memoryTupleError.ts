import {
  MemoryTupleErrorType,
  MemoryTupleErrorTypes,
} from '../enumerations/memoryTupleErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class MemoryTupleError extends HandleableError {
  public readonly reason: MemoryTupleErrorType;
  constructor(
    reason: MemoryTupleErrorType,
    tupleSize?: number,
    language?: StringLanguages,
  ) {
    super(
      translate(MemoryTupleErrorTypes[reason], language, {
        ...(tupleSize ? { TUPLE_SIZE: tupleSize.toString() } : {}),
      }),
    );
    this.name = 'MemoryTupleError';
    this.reason = reason;
  }
}
