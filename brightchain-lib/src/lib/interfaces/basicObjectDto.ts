import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface IBasicObjectDTO<
  TID extends PlatformID = Uint8Array,
  D extends Date | string = Date,
> {
  /**
   * ID of the data object. Must be unique, usually UUID v4.
   */
  id: TID;
  /**
   * The date this object was created
   */
  dateCreated: D;
}
