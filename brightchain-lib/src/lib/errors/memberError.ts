import {
  MemberErrorType,
  MemberErrorTypes,
} from '../enumerations/memberErrorType';
import { StringLanguages } from '../enumerations/stringLanguages';
import { translate } from '../i18n';
import { HandleableError } from './handleable';

export class MemberError extends HandleableError {
  public readonly type: MemberErrorType;
  constructor(type: MemberErrorType, language?: StringLanguages) {
    super(translate(MemberErrorTypes[type], language));
    this.name = 'MemberError';
    this.type = type;
  }
}
