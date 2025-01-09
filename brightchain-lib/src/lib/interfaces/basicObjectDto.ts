import { AnyBrand } from 'ts-brand';
import { HexString } from '../types';

export interface IBasicObjectDTO<
  I extends AnyBrand = HexString,
  D extends Date | string = Date
> {
  /**
   * ID of the data object. Must be unique, usually UUID v4.
   */
  id: I;
  /**
   * The date this object was created
   */
  dateCreated: D;
}
