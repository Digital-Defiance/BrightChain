import { DocumentErrorType } from '../enumerations/documentErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class DocumentError extends TypedError<DocumentErrorType> {
  public get reasonMap(): Record<DocumentErrorType, StringNames> {
    return {
      [DocumentErrorType.FieldRequired]:
        StringNames.Error_DocumentErrorFieldRequiredTemplate,
      [DocumentErrorType.InvalidValue]:
        StringNames.Error_DocumentErrorInvalidValueTemplate,
      [DocumentErrorType.AlreadyInitialized]:
        StringNames.Error_DocumentErrorAlreadyInitialized,
      [DocumentErrorType.Uninitialized]:
        StringNames.Error_DocumentErrorUninitialized,
    };
  }
  constructor(
    type: DocumentErrorType,
    otherVars?: Record<string, string | number>,
    language?: StringLanguages,
  ) {
    super(type, undefined, otherVars);
    this.name = 'DocumentError';
  }
}
