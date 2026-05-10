/**
 * Status of a follow request
 */
export enum FollowRequestStatus {
  /** Request is pending approval */
  Pending = 'pending',
  /** Request has been approved */
  Approved = 'approved',
  /** Request has been rejected */
  Rejected = 'rejected',
}
