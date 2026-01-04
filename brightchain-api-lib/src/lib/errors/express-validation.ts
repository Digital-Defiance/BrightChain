import { Result, ValidationError } from 'express-validator';
import { HandleableError } from '@digitaldefiance/i18n-lib';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';

export class ExpressValidationError extends HandleableError {
  public readonly errors: Result<ValidationError>;

  constructor(errors: Result<ValidationError>) {
    super(new Error(SuiteCoreStringKey.ValidationError), { statusCode: 400 });
    this.errors = errors;
    this.name = 'ExpressValidationError';
  }
}
