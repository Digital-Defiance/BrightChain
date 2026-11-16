import { ChecksumString, HexString } from '@digitaldefiance/ecies-lib';
import { IBasicDataObjectDTO } from '../interfaces/basicDataObjectDto';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';

export interface BlockDto extends IBasicDataObjectDTO {
  id: ChecksumString;
  data: HexString;
  dateCreated: BrightDateTimestamp;
}
