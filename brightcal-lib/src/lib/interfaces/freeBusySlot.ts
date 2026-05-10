/**
 * Free/busy time slot
 * @see Requirements 8.1
 */
export interface IFreeBusySlot {
  start: string; // ISO 8601
  end: string; // ISO 8601
  type: 'BUSY' | 'BUSY-TENTATIVE' | 'BUSY-UNAVAILABLE' | 'FREE';
}
