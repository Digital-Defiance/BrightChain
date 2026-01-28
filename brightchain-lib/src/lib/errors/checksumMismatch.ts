import { BrightChainStrings } from '../enumerations/brightChainStrings';
import { translate } from '../i18n';
import { Checksum } from '../types/checksum';

export class ChecksumMismatchError extends Error {
  public readonly checksum: Checksum;
  public readonly expected: Checksum;
  constructor(checksum: Checksum, expected: Checksum, _language?: string) {
    super(
      translate(BrightChainStrings.Error_Checksum_MismatchTemplate, {
        EXPECTED: expected.toHex(),
        CHECKSUM: checksum.toHex(),
      }),
    );
    this.name = 'ChecksumMismatchError';
    Object.setPrototypeOf(this, ChecksumMismatchError.prototype);
    this.checksum = checksum;
    this.expected = expected;
  }
}
