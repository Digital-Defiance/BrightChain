import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ConflictSeverity } from '../enums';

/**
 * Conflict detection result
 * @see Requirements 6.1
 */
export interface IConflictResult<TID extends PlatformID = string> {
  eventA: {
    id: TID;
    summary: string;
    start: string;
    end: string;
    calendarId: TID;
  };
  eventB: {
    id: TID;
    summary: string;
    start: string;
    end: string;
    calendarId: TID;
  };
  severity: ConflictSeverity;
  overlapStart: string;
  overlapEnd: string;
}
