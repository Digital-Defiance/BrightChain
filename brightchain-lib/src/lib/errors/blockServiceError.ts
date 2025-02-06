import {
  BlockServiceErrorType,
  BlockServiceErrorTypes,
} from '../enumerations/blockServiceErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class BlockServiceError extends HandleableError {
  public readonly reason: BlockServiceErrorType;

  constructor(reason: BlockServiceErrorType, language?: StringLanguages) {
    super(translate(BlockServiceErrorTypes[reason], language));
    this.name = 'BlockServiceError';
    this.reason = reason;
  }
}
