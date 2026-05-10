/**
 * iTIP method types for scheduling messages (RFC 5546).
 * @see Requirements 10.1
 */
export enum ITipMethod {
  Request = 'REQUEST',
  Reply = 'REPLY',
  Cancel = 'CANCEL',
  Counter = 'COUNTER',
  DeclineCounter = 'DECLINECOUNTER',
}
