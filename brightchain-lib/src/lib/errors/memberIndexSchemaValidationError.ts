import type { ValidationFieldError } from '../interfaces';

export class MemberIndexSchemaValidationError extends Error {
  public readonly fieldErrors: ValidationFieldError[];

  constructor(fieldErrors: ValidationFieldError[]) {
    const summary = fieldErrors
      .map((e) => `${e.field}: ${e.message}`)
      .join('; ');
    super(`Member index document failed schema validation: ${summary}`);
    this.name = 'MemberIndexSchemaValidationError';
    this.fieldErrors = fieldErrors;
  }
}
