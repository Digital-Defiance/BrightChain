import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';
export class DisposedError extends Error {
  constructor() {
    super(translate(BrightChainStrings.Error_Disposed));
    this.name = 'DisposedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
