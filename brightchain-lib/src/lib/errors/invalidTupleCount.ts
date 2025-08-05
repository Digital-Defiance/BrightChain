import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class InvalidTupleCountError extends Error {
  constructor(tupleCount: number, language?: StringLanguages) {
    super(
      translate(StringNames.Error_InvalidTupleCountTemplate, {
        TUPLE_COUNT: tupleCount,
      }),
    );
    this.name = 'InvalidTupleCountError';
    Object.setPrototypeOf(this, InvalidTupleCountError.prototype);
  }
}
