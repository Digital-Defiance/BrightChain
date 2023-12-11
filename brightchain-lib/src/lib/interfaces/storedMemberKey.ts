import { MemberKeyUse } from "../enumerations/memberKeyUse";
import { KeyType } from "../enumerations/keyType";

export interface IStoredMemberKey {
  readonly keyType: KeyType;
  readonly keyUse: MemberKeyUse;
  readonly publicKey: Buffer;
  readonly privateKey?: Buffer;
}
