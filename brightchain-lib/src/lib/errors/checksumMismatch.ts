import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';
import { ChecksumBuffer } from '../types';

export class ChecksumMismatchError extends Error {
  public readonly checksum: ChecksumBuffer;
  public readonly expected: ChecksumBuffer;
  constructor(
    checksum: ChecksumBuffer,
    expected: ChecksumBuffer,
    language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_ChecksumMismatchTemplate, language, {
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
