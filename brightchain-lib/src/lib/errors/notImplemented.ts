import BrightChainStrings from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class NotImplementedError extends Error {
  constructor() {
    super(translate(BrightChainStrings.Error_NotImplemented));
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
