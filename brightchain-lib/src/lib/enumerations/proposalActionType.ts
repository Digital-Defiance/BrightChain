/**
 * @fileoverview Proposal action type enumeration.
 *
 * Defines the types of actions that can be proposed for quorum voting.
 *
 * @see Requirements 11, 12, 13, 15, 17
 */

export enum ProposalActionType {
  ADD_MEMBER = 'ADD_MEMBER',
  REMOVE_MEMBER = 'REMOVE_MEMBER',
  BAN_MEMBER = 'BAN_MEMBER',
  UNBAN_MEMBER = 'UNBAN_MEMBER',
  CHANGE_THRESHOLD = 'CHANGE_THRESHOLD',
  TRANSITION_TO_QUORUM_MODE = 'TRANSITION_TO_QUORUM_MODE',
  UNSEAL_DOCUMENT = 'UNSEAL_DOCUMENT',
  IDENTITY_DISCLOSURE = 'IDENTITY_DISCLOSURE',
  REGISTER_ALIAS = 'REGISTER_ALIAS',
  DEREGISTER_ALIAS = 'DEREGISTER_ALIAS',
  EXTEND_STATUTE = 'EXTEND_STATUTE',
  /** Hierarchical quorum support: update inner quorum member subset (Req 12) */
  CHANGE_INNER_QUORUM = 'CHANGE_INNER_QUORUM',
  CUSTOM = 'CUSTOM',
}
