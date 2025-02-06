import { StringNames } from './stringNames';

export enum QuorumErrorType {
  InvalidQuorumId = 'InvalidQuorumId',
  DocumentNotFound = 'DocumentNotFound',
  UnableToRestoreDocument = 'UnableToRestoreDocument',
  NotImplemented = 'NotImplemented',
}

export const QuorumErrorTypes: {
  [key in QuorumErrorType]: StringNames;
} = {
  [QuorumErrorType.InvalidQuorumId]:
    StringNames.Error_QuorumErrorInvalidQuorumId,
  [QuorumErrorType.DocumentNotFound]:
    StringNames.Error_QuorumErrorDocumentNotFound,
  [QuorumErrorType.UnableToRestoreDocument]:
    StringNames.Error_QuorumErrorUnableToRestoreDocument,
  [QuorumErrorType.NotImplemented]: StringNames.Error_QuorumErrorNotImplemented,
};
