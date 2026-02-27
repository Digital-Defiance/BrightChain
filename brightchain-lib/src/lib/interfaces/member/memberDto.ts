import { HexString, MemberType } from '@digitaldefiance/ecies-lib';
import { IBasicObjectDTO } from '../basicObjectDto';

export interface IMemberDTO<
  D extends Date | string = Date,
> extends IBasicObjectDTO<HexString, D> {
  id: HexString;
  type: MemberType;
  name: string;
  contactEmail: string;
  publicKey: string;
  votingPublicKey: string;
  createdBy: HexString;
  dateCreated: D;
  dateUpdated: D;
}
