import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { DocumentErrorType } from '../enumerations/documentErrorType';
import { TypedError } from './typedError';

export class DocumentError extends TypedError<DocumentErrorType> {
  public get reasonMap(): Record<DocumentErrorType, BrightChainStringKey> {
    return {
      [DocumentErrorType.FieldRequired]:
        BrightChainStrings.Error_DocumentError_FieldRequiredTemplate,
      [DocumentErrorType.InvalidValue]:
        BrightChainStrings.Error_DocumentError_InvalidValueTemplate,
      [DocumentErrorType.AlreadyInitialized]:
        BrightChainStrings.Error_DocumentError_AlreadyInitialized,
      [DocumentErrorType.Uninitialized]:
        BrightChainStrings.Error_DocumentError_Uninitialized,
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
