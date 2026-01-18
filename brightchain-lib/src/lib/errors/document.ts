import { DocumentErrorType } from '../enumerations/documentErrorType';
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
    _language?: string,
  ) {
    super(type, undefined, otherVars);
    this.name = 'DocumentError';
  }
}
