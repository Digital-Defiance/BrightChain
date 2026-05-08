import { HexString, MemberType } from '@digitaldefiance/ecies-lib';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { IBasicObjectDTO } from '../basicObjectDto';

export interface IMemberDTO<D extends BrightDateTimestamp | Date | string = BrightDateTimestamp>
  extends IBasicObjectDTO<HexString, D> {
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
