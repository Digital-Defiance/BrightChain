import { HexString, ShortHexGuid } from '../types';
import { IBasicDataObjectDTO } from './basicDataObjectDto';
import { IReadOnlyBasicObjectDTO } from './readOnlyBasicObjectDto';

export interface IReadOnlyDataObjectDTO
  extends IBasicDataObjectDTO,
    IReadOnlyBasicObjectDTO {
  readonly id: HexString;
  readonly dataChunks: Uint8Array[];
  readonly createdBy: ShortHexGuid;
  readonly dateCreated: Date;
}
