import { ValidationErrorType } from '../enumerations/validationErrorType';

export class ValidationError extends Error {
  constructor(
    public readonly type: ValidationErrorType,
    message?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message ?? type);
    this.name = 'ValidationError';
  }
}
