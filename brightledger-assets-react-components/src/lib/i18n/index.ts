/**
 * @fileoverview BrightLedger UI string keys for
 * @brightchain/brightledger-assets-react-components.
 *
 * These keys feed into the `useI18n` hook from
 * `@digitaldefiance/express-suite-react-components`.  Default English values
 * are supplied so the components render correctly even without a full i18n
 * catalogue.
 *
 * Approved vocabulary only — see Requirements 8.1, 8.3.
 */

export const BrightLedgerStrings = {
  // ── Asset registry ─────────────────────────────────────────────────────
  assetRegistryTitle: 'Asset Registry',
  assetRegistryEmpty: 'No assets have been issued.',
  assetRegistryColumnSymbol: 'Symbol',
  assetRegistryColumnDisplayName: 'Display Name',
  assetRegistryColumnDecimals: 'Decimals',
  assetRegistryColumnSupplyPolicy: 'Supply Policy',
  assetRegistryColumnTransferPolicy: 'Transfer Policy',
  assetRegistryColumnFreezable: 'Freezable',
  assetRegistryColumnBurnable: 'Burnable',
  assetRegistryColumnRetired: 'Retired',
  assetRegistryRetiredYes: 'Yes',
  assetRegistryRetiredNo: 'No',

  // ── Wallet balances ────────────────────────────────────────────────────
  walletBalancesTitle: 'Account Balances',
  walletBalancesEmpty: 'No balances for this account.',
  walletBalancesColumnAsset: 'Asset',
  walletBalancesColumnBalance: 'Balance',

  // ── Transfer composer ──────────────────────────────────────────────────
  transferComposerTitle: 'Transfer',
  transferComposerLabelAsset: 'Asset',
  transferComposerLabelAmount: 'Amount',
  transferComposerLabelRecipient: 'Recipient Account',
  transferComposerLabelNonce: 'Nonce',
  transferComposerLabelMemo: 'Memo (optional)',
  transferComposerSubmit: 'Submit Transfer',
  transferComposerSelectAsset: '— select asset —',
  transferComposerValidationAmount: 'Amount must be a positive integer.',
  transferComposerValidationRecipient: 'Recipient must not be empty.',
  transferComposerValidationAsset: 'Please select an asset.',

  // ── Issuer admin panel ─────────────────────────────────────────────────
  issuerAdminPanelTitle: 'Issuer Administration',
  issuerAdminIssueTitle: 'Issue New Asset',
  issuerAdminIssueSymbol: 'Symbol',
  issuerAdminIssueDisplayName: 'Display Name',
  issuerAdminIssueDecimals: 'Decimals',
  issuerAdminIssueSupplyPolicy: 'Supply Policy',
  issuerAdminIssueTransferPolicy: 'Transfer Policy',
  issuerAdminIssueFreezable: 'Freezable',
  issuerAdminIssueBurnable: 'Burnable',
  issuerAdminIssueSubmit: 'Issue Asset',
  issuerAdminMintTitle: 'Mint Units',
  issuerAdminMintSelectAsset: '— select asset —',
  issuerAdminMintLabelAsset: 'Asset',
  issuerAdminMintLabelRecipient: 'Recipient Account',
  issuerAdminMintLabelAmount: 'Amount',
  issuerAdminMintSubmit: 'Mint',

  // ── Audit trail ────────────────────────────────────────────────────────
  auditTrailTitle: 'Audit Trail',
  auditTrailEmpty: 'No entries found.',
  auditTrailColumnKind: 'Action',
  auditTrailColumnSequence: 'Seq',
  auditTrailColumnTimestamp: 'Timestamp',
  auditTrailColumnEntryHash: 'Entry Hash',
  auditTrailLoadMore: 'Load More',
} as const;

export type BrightLedgerStringKey = keyof typeof BrightLedgerStrings;
