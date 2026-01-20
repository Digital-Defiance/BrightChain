import { MemberType, ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { IBasicObjectDTO } from '../basicObjectDto';

export interface IMemberDTO<
  D extends Date | string = Date,
> extends IBasicObjectDTO<ShortHexGuid, D> {
  id: ShortHexGuid;
  type: MemberType;
  name: string;
  contactEmail: string;
  publicKey: string;
  votingPublicKey: string;
  createdBy: ShortHexGuid;
  dateCreated: D;
  dateUpdated: D;
}
