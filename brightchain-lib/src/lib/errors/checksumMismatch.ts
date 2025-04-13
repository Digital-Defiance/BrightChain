import {
  ChecksumUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { StringLanguages } from '../enumerations/stringLanguages';
import { StringNames } from '../enumerations/stringNames';
import { translate } from '../i18n';

export class ChecksumMismatchError extends Error {
  public readonly checksum: ChecksumUint8Array;
  public readonly expected: ChecksumUint8Array;
  constructor(
    checksum: ChecksumUint8Array,
    expected: ChecksumUint8Array,
    _language?: StringLanguages,
  ) {
    super(
      translate(StringNames.Error_ChecksumMismatchTemplate, {
        EXPECTED: uint8ArrayToHex(expected),
        CHECKSUM: uint8ArrayToHex(checksum),
      }),
    );
    this.name = 'ChecksumMismatchError';
    Object.setPrototypeOf(this, ChecksumMismatchError.prototype);
    this.checksum = checksum;
    this.expected = expected;
  }
}
