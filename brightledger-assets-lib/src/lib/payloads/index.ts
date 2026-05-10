/**
 * @fileoverview Asset action payload barrel — exports all payload interfaces
 * and the `IAssetAction` discriminated union.
 *
 * @see Design: Layer 3 — Programmable Asset Ledger
 */

export {
  ACTION_KIND_CODE,
  ActionKind,
  CODE_TO_ACTION_KIND,
} from './actionKind.js';
export type { IAttestationAction } from './attestationAction.js';
export {
  DEFAULT_DISPUTE_WINDOW_MS,
  MAX_DISPUTE_WINDOW_MS,
  MIN_DISPUTE_WINDOW_MS,
} from './batchChallengeAction.js';
export type { IBatchChallengeAction } from './batchChallengeAction.js';
export type {
  IBatchSettlementAction,
  IMemberDelta,
} from './batchSettlementAction.js';
export type {
  IBatchSettlementResolutionAction,
  ResolutionOutcome,
} from './batchSettlementResolutionAction.js';
export type { IBurnAction } from './burnAction.js';
export type { IFreezeAccountAction } from './freezeAccountAction.js';
export type { IIssueAssetAction } from './issueAssetAction.js';
export type { IMintAction } from './mintAction.js';
export type { IMultiTransferAction } from './multiTransferAction.js';
export type { IOperatorFreezeAction } from './operatorFreezeAction.js';
export {
  OPERATOR_GRANT_REASON_MAX_LENGTH,
  validateOperatorGrant,
} from './operatorGrantAction.js';
export type {
  IOperatorGrantAction,
  OperatorGrantValidationError,
} from './operatorGrantAction.js';
export type { SupplyPolicy, TransferPolicy } from './policies.js';
export { PROCESS_KEY_MAX_VALIDITY_MS } from './processKeyCertAction.js';
export type { IProcessKeyCertAction } from './processKeyCertAction.js';
export type {
  IProcessKeyRevokeAction,
  ProcessKeyRevokeReason,
} from './processKeyRevokeAction.js';
export {
  RATE_TABLE_UPDATE_KIND,
  validateRateTableUpdate,
} from './rateTableUpdateAction.js';
export type {
  IRateTableUpdateAction,
  IRateTableUpdatePayload,
  RateTableUpdateValidationError,
} from './rateTableUpdateAction.js';
export type { IRetireAssetAction } from './retireAssetAction.js';
export type { IRotateIssuerSetAction } from './rotateIssuerSetAction.js';
export type { ITransferAction } from './transferAction.js';
export type { IUnfreezeAccountAction } from './unfreezeAccountAction.js';
export type { IWhitelistAddAction } from './whitelistAddAction.js';
export type { IWhitelistRemoveAction } from './whitelistRemoveAction.js';

import type { IAttestationAction } from './attestationAction.js';
import type { IBatchChallengeAction } from './batchChallengeAction.js';
import type { IBatchSettlementAction } from './batchSettlementAction.js';
import type { IBatchSettlementResolutionAction } from './batchSettlementResolutionAction.js';
import type { IBurnAction } from './burnAction.js';
import type { IFreezeAccountAction } from './freezeAccountAction.js';
import type { IIssueAssetAction } from './issueAssetAction.js';
import type { IMintAction } from './mintAction.js';
import type { IMultiTransferAction } from './multiTransferAction.js';
import type { IOperatorFreezeAction } from './operatorFreezeAction.js';
import type { IOperatorGrantAction } from './operatorGrantAction.js';
import type { IProcessKeyCertAction } from './processKeyCertAction.js';
import type { IProcessKeyRevokeAction } from './processKeyRevokeAction.js';
import type { IRateTableUpdateAction } from './rateTableUpdateAction.js';
import type { IRetireAssetAction } from './retireAssetAction.js';
import type { IRotateIssuerSetAction } from './rotateIssuerSetAction.js';
import type { ITransferAction } from './transferAction.js';
import type { IUnfreezeAccountAction } from './unfreezeAccountAction.js';
import type { IWhitelistAddAction } from './whitelistAddAction.js';
import type { IWhitelistRemoveAction } from './whitelistRemoveAction.js';

/**
 * Discriminated union of all asset action payloads.
 *
 * Use the `kind` field to narrow to a specific action type in switch statements.
 */
export type IAssetAction =
  | IIssueAssetAction
  | IMintAction
  | IBurnAction
  | ITransferAction
  | IMultiTransferAction
  | IFreezeAccountAction
  | IUnfreezeAccountAction
  | IWhitelistAddAction
  | IWhitelistRemoveAction
  | IRotateIssuerSetAction
  | IRetireAssetAction
  | IAttestationAction
  | IOperatorFreezeAction
  | IBatchSettlementAction
  | IProcessKeyCertAction
  | IProcessKeyRevokeAction
  | IBatchChallengeAction
  | IBatchSettlementResolutionAction
  | IRateTableUpdateAction
  | IOperatorGrantAction;
