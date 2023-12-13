import { ChecksumString, ShortHexGuid } from "../types";
import { IBasicObjectDTO } from "./basicObjectDto";

export interface IBasicDataObjectDTO extends IBasicObjectDTO {
  /**
   * ID of the data object. checksum of the data.
   */
  id: ChecksumString;
  /**
   * The data to be stored
   */
  data: Uint8Array;
  /**
   * The ID of the member who created this object
   */
  createdBy: ShortHexGuid;
  /**
   * The date this object was created
   */
  dateCreated: Date;
}