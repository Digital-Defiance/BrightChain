import { DocumentErrorType } from '../enumerations/documentErrorType';
import BrightChainStrings from '../enumerations/brightChainStrings';
import { TypedError } from './typedError';

export class DocumentError extends TypedError<DocumentErrorType> {
  public get reasonMap(): Record<DocumentErrorType, BrightChainStrings> {
    return {
      [DocumentErrorType.FieldRequired]:
        BrightChainStrings.Error_DocumentErrorFieldRequiredTemplate,
      [DocumentErrorType.InvalidValue]:
        BrightChainStrings.Error_DocumentErrorInvalidValueTemplate,
      [DocumentErrorType.AlreadyInitialized]:
        BrightChainStrings.Error_DocumentErrorAlreadyInitialized,
      [DocumentErrorType.Uninitialized]:
        BrightChainStrings.Error_DocumentErrorUninitialized,
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
