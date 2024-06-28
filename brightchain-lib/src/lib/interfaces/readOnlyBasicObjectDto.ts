import { HexString } from "../types";
import { IBasicObjectDTO } from "./basicObjectDto";

export interface IReadOnlyBasicObjectDTO extends IBasicObjectDTO {
  readonly id: HexString;
  readonly dateCreated: Date;
}