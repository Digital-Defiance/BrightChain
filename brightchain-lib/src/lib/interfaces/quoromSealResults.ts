import { Shares } from "secrets.js-34r7h";
import { QuorumDataRecord } from "../quorumDataRecord";

export interface IQoroumSealResults {
  keyShares: Shares;
  record: QuorumDataRecord;
}
