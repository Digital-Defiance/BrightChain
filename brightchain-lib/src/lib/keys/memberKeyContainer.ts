import { KeyFragmentType } from '../enumerations/keyFragmentType';
import { KeyRole } from '../enumerations/keyRole';
import { KeyType } from '../enumerations/keyType';
import { AsymmetricKeyFragment } from './asymmetricKeyFragment';

export class MemberKeyContainer {
  public readonly keyRole: KeyRole;
  public readonly keyType: KeyType;
  public readonly keyFragments: Map<KeyFragmentType, AsymmetricKeyFragment>;
  constructor(
    keyRole: KeyRole,
    keyType: KeyType,
    keyFragments: Map<KeyFragmentType, AsymmetricKeyFragment>,
  ) {
    this.keyRole = keyRole;
    this.keyType = keyType;
    this.keyFragments = keyFragments;
  }
}
