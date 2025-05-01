import StringNames from '../enumerations/stringNames';
import { translate } from '../i18n';

export class NotImplementedError extends Error {
  constructor() {
    super(translate(StringNames.Error_NotImplemented));
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
