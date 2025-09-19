import { Pbkdf2ErrorType } from '../enumerations/pbkdf2ErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class Pbkdf2Error extends TypedError<Pbkdf2ErrorType> {
  public get reasonMap(): Record<Pbkdf2ErrorType, StringNames> {
    return {
      [Pbkdf2ErrorType.InvalidSaltLength]:
        StringNames.Error_Pbkdf2InvalidSaltLength,
      [Pbkdf2ErrorType.InvalidHashLength]:
        StringNames.Error_Pbkdf2InvalidHashLength,
    };
  }
  constructor(type: Pbkdf2ErrorType, language?: StringLanguages) {
    super(type, undefined);
    this.name = 'Pbkdf2Error';
  }
}
