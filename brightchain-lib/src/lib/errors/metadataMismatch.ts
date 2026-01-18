import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class MetadataMismatchError extends Error {
  constructor(_language?: string) {
    super(translate(StringNames.Error_MetadataMismatch));
    this.name = 'MetadataMismatchError';
    Object.setPrototypeOf(this, MetadataMismatchError.prototype);
  }
}
