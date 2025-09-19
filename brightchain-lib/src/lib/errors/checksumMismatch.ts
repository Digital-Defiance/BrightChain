import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { ChecksumUint8Array } from '../types';

export class ChecksumMismatchError extends Error {
  public readonly checksum: ChecksumUint8Array;
  public readonly expected: ChecksumUint8Array;
  constructor(
    checksum: ChecksumUint8Array,
    expected: ChecksumUint8Array,
    language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_ChecksumMismatchTemplate, {
        EXPECTED: expected.toString('hex'),
        CHECKSUM: checksum.toString('hex'),
      }),
    );
    this.name = 'ChecksumMismatchError';
    Object.setPrototypeOf(this, ChecksumMismatchError.prototype);
    this.checksum = checksum;
    this.expected = expected;
  }
}
