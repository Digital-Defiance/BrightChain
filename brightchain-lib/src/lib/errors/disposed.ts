import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { translate } from '../i18n';
export class DisposedError extends Error {
  constructor() {
    super(translate(SuiteCoreStringKey.Error_Disposed));
    this.name = 'DisposedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
