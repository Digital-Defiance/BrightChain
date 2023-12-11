import { ShortHexGuid } from "../guid";

export interface ISortedMemberShareCountArrays {
  memberIds: ShortHexGuid[];
  shares: number[];
  memberCount: number;
  totalShares: number;
}
