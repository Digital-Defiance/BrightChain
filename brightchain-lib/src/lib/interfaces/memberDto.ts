import { AnyBrand } from 'ts-brand';
import { MemberType } from '../enumerations/memberType';
import { ShortHexGuid } from '../types';
import { IBasicObjectDTO } from './basicObjectDto';

export interface IMemberDTO<
  I extends AnyBrand = ShortHexGuid,
  D extends Date | string = Date,
> extends IBasicObjectDTO<I, D> {
  id: I;
  type: MemberType;
  name: string;
  contactEmail: string;
  publicKey: string;
  votingPublicKey: string;
  createdBy: string;
  dateCreated: D;
  dateUpdated: D;
}
