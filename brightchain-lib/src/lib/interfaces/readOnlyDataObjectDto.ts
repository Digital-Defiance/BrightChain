import { ChecksumString, ShortHexGuid } from "../types";
import { IBasicDataObjectDTO } from "./basicDataObjectDto";
import { IReadOnlyBasicObjectDTO } from "./readOnlyBasicObjectDto";

export interface IReadOnlyDataObjectDTO
  extends IBasicDataObjectDTO,
  IReadOnlyBasicObjectDTO {
  readonly id: ChecksumString;
  readonly data: Uint8Array;
  readonly createdBy: ShortHexGuid;
  readonly dateCreated: Date;
}