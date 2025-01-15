import { KeyFragmentType } from '../enumerations/keyFragmentType';
import { KeyRole } from '../enumerations/keyRole';
import { KeyStorageFormat } from '../enumerations/keyStorageFormat';

export class AsymmetricKeyFragment {
  public readonly keyType: KeyType;
  public readonly keyRole: KeyRole;
  public readonly keyFragmentType: KeyFragmentType;
  public readonly KeyStorageFormat: KeyStorageFormat;
  public readonly keyFragment: Buffer;

  constructor(
    keyType: KeyType,
    keyRole: KeyRole,
    keyFragmentType: KeyFragmentType,
    keyStorageFormat: KeyStorageFormat,
    keyFragment: string | Buffer | Uint8Array,
  ) {
    this.keyType = keyType;
    this.keyRole = keyRole;
    this.keyFragmentType = keyFragmentType;
    this.KeyStorageFormat = keyStorageFormat;
    if (typeof keyFragment === 'string') {
      this.keyFragment = Buffer.from(keyFragment, 'utf8');
    } else {
      this.keyFragment = Buffer.from(keyFragment);
    }
  }
}
