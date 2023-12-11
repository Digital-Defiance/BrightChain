import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { translateCore } from '../i18n';

export class DisposedError extends Error {
  constructor() {
    super(translateCore(SuiteCoreStringKey.Error_Disposed));
    this.name = 'DisposedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
