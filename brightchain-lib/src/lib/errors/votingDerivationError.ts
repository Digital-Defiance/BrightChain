import { StringLanguages } from '../enumerations/stringLanguages';
import {
  VotingDerivationErrorType,
  VotingDerivationErrorTypes,
} from '../enumerations/votingDerivationErrorType';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class VotingDerivationError extends HandleableError {
  public readonly type: VotingDerivationErrorType;
  constructor(
    type: VotingDerivationErrorType,
    language?: StringLanguages,
    params?: { [key: string]: string | number },
  ) {
    super(translate(VotingDerivationErrorTypes[type], language, params));
    this.name = 'VotingDerivationError';
    this.type = type;
  }
}
