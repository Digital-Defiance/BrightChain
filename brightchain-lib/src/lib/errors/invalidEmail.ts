import { InvalidEmailErrorType } from '../enumerations/invalidEmailType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class InvalidEmailError extends TypedError<InvalidEmailErrorType> {
  public get reasonMap(): Record<InvalidEmailErrorType, StringNames> {
    return {
      [InvalidEmailErrorType.Invalid]: StringNames.Error_InvalidEmail,
      [InvalidEmailErrorType.Missing]: StringNames.Error_InvalidEmailMissing,
      [InvalidEmailErrorType.Whitespace]:
        StringNames.Error_InvalidEmailWhitespace,
    };
  }
  constructor(type: InvalidEmailErrorType, language?: StringLanguages) {
    super(type, undefined, {
      statusCode: 422,
    });
    this.name = 'InvalidEmailError';
  }
}
