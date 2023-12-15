import { MemberType } from "../enumerations/memberType";
import { ShortHexGuid } from "../types";
import { IBasicObjectDTO } from "./basicObjectDto";

export interface IMemberDTO extends IBasicObjectDTO {
  id: ShortHexGuid;
  type: MemberType;
  name: string;
  contactEmail: string;
  publicKey: string;
  createdBy: string;
  dateCreated: Date;
  dateUpdated: Date;
}