/**
 * Modes for approving follow requests on protected accounts
 */
export enum ApproveFollowersMode {
  /** Require approval for all follow requests */
  ApproveAll = 'approve_all',
  /** Only require approval for non-mutual follows */
  ApproveNonMutuals = 'approve_non_mutuals',
  /** Auto-approve all follow requests (public account) */
  ApproveNone = 'approve_none',
}
