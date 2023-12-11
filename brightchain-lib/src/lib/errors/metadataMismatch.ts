import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';

export class MetadataMismatchError extends Error {
  constructor(_language?: string) {
    super(translate(BrightChainStrings.Error_Metadata_Mismatch));
    this.name = 'MetadataMismatchError';
    Object.setPrototypeOf(this, MetadataMismatchError.prototype);
  }
}
