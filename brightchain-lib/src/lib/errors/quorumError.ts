import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import StringNames from '../enumerations/stringNames';
import { TypedError } from './typedError';

export class QuorumError extends TypedError<QuorumErrorType> {
  public get reasonMap(): Record<QuorumErrorType, StringNames> {
    return {
      [QuorumErrorType.InvalidQuorumId]:
        StringNames.Error_QuorumErrorInvalidQuorumId,
      [QuorumErrorType.DocumentNotFound]:
        StringNames.Error_QuorumErrorDocumentNotFound,
      [QuorumErrorType.UnableToRestoreDocument]:
        StringNames.Error_QuorumErrorUnableToRestoreDocument,
      [QuorumErrorType.NotImplemented]:
        StringNames.Error_QuorumErrorNotImplemented,
      [QuorumErrorType.Uninitialized]:
        StringNames.Error_QuorumErrorUninitialized,
    };
  }
  constructor(type: QuorumErrorType, language?: StringLanguages) {
    super(type, undefined);
    this.name = 'QuorumError';
  }
}
