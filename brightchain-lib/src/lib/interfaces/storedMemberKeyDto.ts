import { MemberKeyUse } from "../enumerations/memberKeyUse";
import { KeyType } from "../enumerations/keyType";

export interface IStoredMemberKeyDTO {
  readonly keyType: KeyType;
  readonly keyUse: MemberKeyUse;
  readonly publicKey: string;
  readonly privateKey?: string;
}
