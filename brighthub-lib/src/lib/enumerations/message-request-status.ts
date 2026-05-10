/**
 * Status of a message request from a non-follower
 */
export enum MessageRequestStatus {
  /** Request is pending acceptance */
  Pending = 'pending',
  /** Request has been accepted */
  Accepted = 'accepted',
  /** Request has been declined */
  Declined = 'declined',
}
