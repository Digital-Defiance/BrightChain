import { HandleableError } from '@brightchain/brightchain-lib';
import { Result, ValidationError } from 'express-validator';

export class ExpressValidationError extends HandleableError {
  public readonly errors: Result<ValidationError> | ValidationError[];
  constructor(errors: Result<ValidationError> | ValidationError[]) {
    const errorsArray = Array.isArray(errors) ? errors : errors.array();
    const errorCount = errorsArray.length;
    super(
      `Validation failed with ${errorCount} error${
        errorCount === 1 ? '' : 's'
      }`,
      { statusCode: 422 },
    );
    this.errors = errors;
    this.name = 'ExpressValidationError';
    Object.setPrototypeOf(this, ExpressValidationError.prototype);
  }
}
