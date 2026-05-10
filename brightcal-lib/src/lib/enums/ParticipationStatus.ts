/**
 * Attendee participation status (PARTSTAT).
 * @see Requirements 10.1
 */
export enum ParticipationStatus {
  NeedsAction = 'NEEDS-ACTION',
  Accepted = 'ACCEPTED',
  Declined = 'DECLINED',
  Tentative = 'TENTATIVE',
  Delegated = 'DELEGATED',
}
