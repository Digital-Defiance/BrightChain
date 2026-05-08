import { ChecksumString, HexString } from '@digitaldefiance/ecies-lib';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';
import { IBasicDataObjectDTO } from '../interfaces/basicDataObjectDto';

export interface BlockDto extends IBasicDataObjectDTO {
  id: ChecksumString;
  data: HexString;
  dateCreated: BrightDateTimestamp;
}
