import { ValidationErrorType } from '../enumerations/validationErrorType';
import { HandleableErrorOptions } from '../interfaces/handleableErrorOptions';
import { HandleableError } from './handleable';

export class ValidationError extends HandleableError {
  constructor(
    public readonly type: ValidationErrorType,
    message?: string,
    public readonly details?: Record<string, unknown>,
    options?: Partial<HandleableErrorOptions>,
  ) {
    super(message ?? type, options);
    this.name = 'ValidationError';
  }
}
