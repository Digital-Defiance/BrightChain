import { HexString } from '@digitaldefiance/ecies-lib';
import { IBasicObjectDTO } from './basicObjectDto';

export interface IReadOnlyBasicObjectDTO extends IBasicObjectDTO<HexString> {
  readonly id: HexString;
  readonly dateCreated: Date;
}
