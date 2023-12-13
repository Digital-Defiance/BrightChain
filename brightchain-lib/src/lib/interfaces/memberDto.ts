import { MemberType } from "../enumerations/memberType";
import { IBasicObjectDTO } from "./basicObjectDto";

export interface IMemberDTO extends IBasicObjectDTO {
  type: MemberType;
  name: string;
  contactEmail: string;
  publicKey: string;
  createdBy: string;
  dateCreated: Date;
  dateUpdated: Date;
}