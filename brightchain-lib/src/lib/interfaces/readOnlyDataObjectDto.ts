import { HexString } from '@digitaldefiance/ecies-lib';
import { IBasicDataObjectDTO } from './basicDataObjectDto';
import { IReadOnlyBasicObjectDTO } from './readOnlyBasicObjectDto';

export interface IReadOnlyDataObjectDTO
  extends IBasicDataObjectDTO, IReadOnlyBasicObjectDTO {
  readonly id: HexString;
  readonly dataChunks: Uint8Array[];
  readonly createdBy: HexString;
  readonly dateCreated: Date;
}
