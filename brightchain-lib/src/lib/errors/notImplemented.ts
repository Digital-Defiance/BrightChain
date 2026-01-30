import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class NotImplementedError extends Error {
  constructor() {
    super(translate(BrightChainStrings.Error_Implementation_NotImplemented));
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
