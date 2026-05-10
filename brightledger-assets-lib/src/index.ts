/**
 * @fileoverview Public API barrel for @brightchain/brightledger-assets-lib.
 *
 * Re-exports all types, constants, and classes that form the public surface of
 * the Programmable Asset Ledger Layer 3 library.
 */

// Asset identity
export { deriveAssetId } from './lib/assetId.js';
export type { AssetIdBuffer } from './lib/assetId.js';

// Errors
export { AssetErrorCode, MalformedActionError } from './lib/errors.js';

// Serializer
export { AssetActionSerializer } from './lib/serializer.js';

// Action kind enum + lookup tables
export {
  ACTION_KIND_CODE,
  ActionKind,
  CODE_TO_ACTION_KIND,
} from './lib/payloads/actionKind.js';

// Policy types
export type { SupplyPolicy, TransferPolicy } from './lib/payloads/policies.js';

// Action payload interfaces
export type { IAttestationAction } from './lib/payloads/attestationAction.js';
export {
  DEFAULT_DISPUTE_WINDOW_MS,
  MAX_DISPUTE_WINDOW_MS,
  MIN_DISPUTE_WINDOW_MS,
} from './lib/payloads/batchChallengeAction.js';
export type { IBatchChallengeAction } from './lib/payloads/batchChallengeAction.js';
export type {
  IBatchSettlementAction,
  IMemberDelta,
} from './lib/payloads/batchSettlementAction.js';
export type {
  IBatchSettlementResolutionAction,
  ResolutionOutcome,
} from './lib/payloads/batchSettlementResolutionAction.js';
export type { IBurnAction } from './lib/payloads/burnAction.js';
export type { IFreezeAccountAction } from './lib/payloads/freezeAccountAction.js';
export type { IIssueAssetAction } from './lib/payloads/issueAssetAction.js';
export type { IMintAction } from './lib/payloads/mintAction.js';
export type { IMultiTransferAction } from './lib/payloads/multiTransferAction.js';
export type { IOperatorFreezeAction } from './lib/payloads/operatorFreezeAction.js';
export { PROCESS_KEY_MAX_VALIDITY_MS } from './lib/payloads/processKeyCertAction.js';
export type { IProcessKeyCertAction } from './lib/payloads/processKeyCertAction.js';
export type {
  IProcessKeyRevokeAction,
  ProcessKeyRevokeReason,
} from './lib/payloads/processKeyRevokeAction.js';
export type { IRetireAssetAction } from './lib/payloads/retireAssetAction.js';
export type { IRotateIssuerSetAction } from './lib/payloads/rotateIssuerSetAction.js';
export type { ITransferAction } from './lib/payloads/transferAction.js';
export type { IUnfreezeAccountAction } from './lib/payloads/unfreezeAccountAction.js';
export type { IWhitelistAddAction } from './lib/payloads/whitelistAddAction.js';
export type { IWhitelistRemoveAction } from './lib/payloads/whitelistRemoveAction.js';

// Discriminated union
export type { IAssetAction } from './lib/payloads/index.js';
