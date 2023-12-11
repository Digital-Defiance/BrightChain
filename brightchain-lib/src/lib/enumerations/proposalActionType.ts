/**
 * @fileoverview Proposal action type enumeration.
 *
 * Defines the types of actions that can be proposed for BrightTrust voting.
 *
 * @see Requirements 11, 12, 13, 15, 17
 */

export enum ProposalActionType {
  ADD_MEMBER = 'ADD_MEMBER',
  REMOVE_MEMBER = 'REMOVE_MEMBER',
  BAN_MEMBER = 'BAN_MEMBER',
  UNBAN_MEMBER = 'UNBAN_MEMBER',
  CHANGE_THRESHOLD = 'CHANGE_THRESHOLD',
  TRANSITION_TO_BRIGHT_TRUST_MODE = 'TRANSITION_TO_BRIGHT_TRUST_MODE',
  UNSEAL_DOCUMENT = 'UNSEAL_DOCUMENT',
  IDENTITY_DISCLOSURE = 'IDENTITY_DISCLOSURE',
  REGISTER_ALIAS = 'REGISTER_ALIAS',
  DEREGISTER_ALIAS = 'DEREGISTER_ALIAS',
  EXTEND_STATUTE = 'EXTEND_STATUTE',
  /** Hierarchical BrightTrust support: update inner BrightTrust member subset (Req 12) */
  CHANGE_INNER_BRIGHT_TRUST = 'CHANGE_INNER_BRIGHT_TRUST',
  CUSTOM = 'CUSTOM',
}
