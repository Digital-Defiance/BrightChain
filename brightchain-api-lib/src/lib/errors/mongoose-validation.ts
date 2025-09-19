import {
  HandleableError,
  LanguageContext,
  StringLanguage,
  StringName,
  translate,
} from '@brightchain/brightchain-lib';
import { Error } from 'mongoose';

export class MongooseValidationError extends HandleableError {
  public readonly errors: {
    [path: string]: Error.CastError | Error.ValidatorError;
  };
  constructor(
    validationErrors: {
      [path: string]: Error.CastError | Error.ValidatorError;
    },
    language?: StringLanguage,
    context?: LanguageContext,
  ) {
    super(
      `${translate(
        StringName.ValidationError,
        undefined,
        language,
        context,
      )}: ${JSON.stringify(validationErrors)}`,
      { statusCode: 422 },
    );
    this.name = 'ValidationError';
    this.errors = validationErrors;
    Object.setPrototypeOf(this, MongooseValidationError.prototype);
  }
}
