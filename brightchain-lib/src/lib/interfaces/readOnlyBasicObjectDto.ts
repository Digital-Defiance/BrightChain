import { ChecksumString } from "../types";
import { IBasicObjectDTO } from "./basicObjectDto";

export interface IReadOnlyBasicObjectDTO extends IBasicObjectDTO {
  readonly id: ChecksumString;
  readonly dateCreated: Date;
}