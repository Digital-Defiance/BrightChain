import { HexString } from "../types";

export interface IBasicObjectDTO {
  /**
   * ID of the data object. Must be unique, usually UUID v4.
   */
  id: HexString;
  /**
   * The date this object was created
   */
  dateCreated: Date;
}