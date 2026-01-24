import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class InvalidTupleCountError extends Error {
  constructor(tupleCount: number, _language?: string) {
    super(
      translate(BrightChainStrings.Error_InvalidTupleCountTemplate, {
        TUPLE_COUNT: tupleCount,
      }),
    );
    this.name = 'InvalidTupleCountError';
    Object.setPrototypeOf(this, InvalidTupleCountError.prototype);
  }
}
