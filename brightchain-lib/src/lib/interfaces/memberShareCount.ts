import { ShortHexGuid } from "../guid";

export interface IMemberShareCount {
  memberId: ShortHexGuid;
  shares: number;
}
