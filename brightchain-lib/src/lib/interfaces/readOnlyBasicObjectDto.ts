import { IBasicObjectDTO } from "./basicObjectDto";

export interface IReadOnlyBasicObjectDTO extends IBasicObjectDTO {
  readonly id: string;
  readonly dateCreated: Date;
}