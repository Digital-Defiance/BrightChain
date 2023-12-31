import { IBasicDataObjectDTO } from '../interfaces/basicDataObjectDto';
import { ChecksumString, HexString } from '../types';

export interface BlockDto extends IBasicDataObjectDTO {
  id: ChecksumString;
  data: HexString;
  dateCreated: Date;
}
