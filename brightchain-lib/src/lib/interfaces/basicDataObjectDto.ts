import { HexString } from '@digitaldefiance/ecies-lib';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';
import { IBasicObjectDTO } from './basicObjectDto';

export interface IBasicDataObjectDTO extends IBasicObjectDTO<HexString, BrightDateTimestamp> {
  /**
   * ID of the data object. checksum of the data.
   */
  id: HexString;
  /**
   * The data to be stored
   */
  data: HexString;
  /**
   * The date this object was created
   */
  dateCreated: BrightDateTimestamp;
}
