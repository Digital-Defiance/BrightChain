import {
  QuorumErrorType,
  QuorumErrorTypes,
} from '../enumerations/quorumErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class QuorumError extends HandleableError {
  public readonly reason: QuorumErrorType;

  constructor(reason: QuorumErrorType, language?: StringLanguages) {
    super(translate(QuorumErrorTypes[reason], language));
    this.name = 'QuorumError';
    this.reason = reason;
  }
}
