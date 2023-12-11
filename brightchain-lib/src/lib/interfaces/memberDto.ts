import { MemberType } from "../enumerations/memberType";
import { IBasicObjectDTO } from "./basicObjectDto";
import { IStoredMemberKeyDTO } from "./storedMemberKeyDto";

export interface IMemberDTO extends IBasicObjectDTO {
  type: MemberType;
  name: string;
  contactEmail: string;
  keys: { [key: string]: IStoredMemberKeyDTO };
  createdBy: string;
  dateCreated: Date;
  dateUpdated: Date;
}