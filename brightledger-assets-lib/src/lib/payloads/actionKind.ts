/**
 * @fileoverview ActionKind enum — discriminant for all asset action payloads.
 *
 * @see Design: Layer 3 — Programmable Asset Ledger
 */

/** All valid asset action kind identifiers. */
export enum ActionKind {
  IssueAsset = 'IssueAsset',
  Mint = 'Mint',
  Burn = 'Burn',
  Transfer = 'Transfer',
  MultiTransfer = 'MultiTransfer',
  FreezeAccount = 'FreezeAccount',
  UnfreezeAccount = 'UnfreezeAccount',
  WhitelistAdd = 'WhitelistAdd',
  WhitelistRemove = 'WhitelistRemove',
  RotateIssuerSet = 'RotateIssuerSet',
  RetireAsset = 'RetireAsset',
  Attestation = 'Attestation',
  OperatorFreeze = 'OperatorFreeze',
  BatchSettlement = 'BatchSettlement',
  ProcessKeyCert = 'ProcessKeyCert',
  ProcessKeyRevoke = 'ProcessKeyRevoke',
  BatchChallenge = 'BatchChallenge',
  BatchSettlementResolution = 'BatchSettlementResolution',
  RateTableUpdate = 'RateTableUpdate',
  OperatorGrant = 'OperatorGrant',
}

/** Numeric wire codes for each action kind, used in serialization. */
export const ACTION_KIND_CODE: Readonly<Record<ActionKind, number>> = {
  [ActionKind.IssueAsset]: 0x01,
  [ActionKind.Mint]: 0x02,
  [ActionKind.Burn]: 0x03,
  [ActionKind.Transfer]: 0x04,
  [ActionKind.MultiTransfer]: 0x05,
  [ActionKind.FreezeAccount]: 0x06,
  [ActionKind.UnfreezeAccount]: 0x07,
  [ActionKind.WhitelistAdd]: 0x08,
  [ActionKind.WhitelistRemove]: 0x09,
  [ActionKind.RotateIssuerSet]: 0x0a,
  [ActionKind.RetireAsset]: 0x0b,
  [ActionKind.Attestation]: 0x0c,
  [ActionKind.OperatorFreeze]: 0x0d,
  [ActionKind.BatchSettlement]: 0x0e,
  [ActionKind.ProcessKeyCert]: 0x0f,
  [ActionKind.ProcessKeyRevoke]: 0x10,
  [ActionKind.BatchChallenge]: 0x11,
  [ActionKind.BatchSettlementResolution]: 0x12,
  [ActionKind.RateTableUpdate]: 0x13,
  [ActionKind.OperatorGrant]: 0x14,
} as const;

/** Reverse lookup: wire code → ActionKind. */
export const CODE_TO_ACTION_KIND: Readonly<Record<number, ActionKind>> =
  Object.fromEntries(
    Object.entries(ACTION_KIND_CODE).map(([k, v]) => [v, k as ActionKind]),
  );
