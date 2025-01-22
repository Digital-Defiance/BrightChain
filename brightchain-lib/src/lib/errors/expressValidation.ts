import { Result, ValidationError } from 'express-validator';

export class ExpressValidationError extends Error {
  public readonly errors: Result<ValidationError>;
  constructor(errors: Result<ValidationError>) {
    const errorsArray = errors.array();
    const errorCount = errorsArray.length;
    super(
      `Validation failed with ${errorCount} error${errorCount === 1 ? '' : 's'}`,
    );
    this.errors = errors;
    this.name = 'ExpressValidationError';
    Object.setPrototypeOf(this, ExpressValidationError.prototype);
  }
}
