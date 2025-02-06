import { StringLanguages } from '../enumerations/stringLanguages';
import {
  VotingErrorType,
  VotingErrorTypes,
} from '../enumerations/votingErrorType';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class VotingError extends HandleableError {
  public readonly type: VotingErrorType;
  constructor(
    type: VotingErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(translate(VotingErrorTypes[type], language, params));
    this.name = 'VotingError';
    this.type = type;
  }
}
