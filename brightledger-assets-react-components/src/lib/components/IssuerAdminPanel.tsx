/**
 * @fileoverview IssuerAdminPanel — governance forms for issuing new assets
 * and minting additional units.
 *
 * Like {@link TransferComposer}, this component emits simplified form data
 * objects rather than the cryptographically-complete action types, as the
 * full `IIssueAssetAction`/`IMintAction` construction requires signing
 * infrastructure external to the component layer.
 *
 * @see Requirements 1.1, 2.1
 */

import type { IAssetDescriptor } from '@brightchain/brightledger-assets-api-lib';
import type {
  SupplyPolicy,
  TransferPolicy,
} from '@brightchain/brightledger-assets-lib';
import React, { useState } from 'react';
import { BrightLedgerStrings } from '../i18n/index.js';

const SUPPLY_POLICIES: SupplyPolicy[] = ['fixed', 'mintable'];
const TRANSFER_POLICIES: TransferPolicy[] = ['open', 'whitelist'];

// ── Public types ──────────────────────────────────────────────────────────────

/** Form data emitted when the user submits the "Issue Asset" form. */
export interface IIssueAssetFormData {
  readonly symbol: string;
  readonly displayName: string;
  readonly decimals: number;
  readonly supplyPolicy: SupplyPolicy;
  readonly transferPolicy: TransferPolicy;
  readonly freezable: boolean;
  readonly burnable: boolean;
}

/** Form data emitted when the user submits the "Mint" form. */
export interface IMintFormData {
  /** Hex asset ID. */
  readonly assetId: string;
  /** Display symbol (for user confirmation). */
  readonly assetSymbol: string;
  /** Decimal amount string — caller converts to bigint µ-units. */
  readonly amount: string;
  /** Hex-encoded recipient account public key. */
  readonly recipient: string;
}

export interface IssuerAdminPanelProps {
  /** Registered assets available for minting. */
  assets: ReadonlyMap<string, IAssetDescriptor>;
  /** Called when the user submits a valid "Issue Asset" form. */
  onIssue: (formData: IIssueAssetFormData) => void;
  /** Called when the user submits a valid "Mint" form. */
  onMint: (formData: IMintFormData) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * IssuerAdminPanel renders two controlled sub-forms:
 * 1. **Issue Asset** — define and register a new asset class.
 * 2. **Mint** — create additional units of an existing asset.
 */
export function IssuerAdminPanel({
  assets,
  onIssue,
  onMint,
}: IssuerAdminPanelProps) {
  const s = BrightLedgerStrings;

  // ── Issue form state ────────────────────────────────────────────────────
  const [symbol, setSymbol] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [decimals, setDecimals] = useState(6);
  const [supplyPolicy, setSupplyPolicy] = useState<SupplyPolicy>('fixed');
  const [transferPolicy, setTransferPolicy] = useState<TransferPolicy>('open');
  const [freezable, setFreezable] = useState(false);
  const [burnable, setBurnable] = useState(false);

  // ── Mint form state ──────────────────────────────────────────────────────
  const [mintAssetId, setMintAssetId] = useState('');
  const [mintRecipient, setMintRecipient] = useState('');
  const [mintAmount, setMintAmount] = useState('');

  function handleIssueSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onIssue({
      symbol,
      displayName,
      decimals,
      supplyPolicy,
      transferPolicy,
      freezable,
      burnable,
    });
    setSymbol('');
    setDisplayName('');
    setDecimals(6);
    setSupplyPolicy('fixed');
    setTransferPolicy('open');
    setFreezable(false);
    setBurnable(false);
  }

  function handleMintSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const descriptor = assets.get(mintAssetId);
    onMint({
      assetId: mintAssetId,
      assetSymbol: descriptor?.symbol ?? mintAssetId,
      amount: mintAmount.trim(),
      recipient: mintRecipient.trim(),
    });
    setMintAssetId('');
    setMintRecipient('');
    setMintAmount('');
  }

  return (
    <div className="brightledger-issuer-admin-panel">
      <h2 className="brightledger-issuer-admin-panel__title">
        {s.issuerAdminPanelTitle}
      </h2>

      {/* ── Issue Asset form ── */}
      <section
        className="brightledger-issuer-admin-panel__section"
        aria-label={s.issuerAdminIssueTitle}
      >
        <h3>{s.issuerAdminIssueTitle}</h3>
        <form onSubmit={handleIssueSubmit} noValidate>
          <div>
            <label htmlFor="issue-symbol">{s.issuerAdminIssueSymbol}</label>
            <input
              id="issue-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="issue-display-name">
              {s.issuerAdminIssueDisplayName}
            </label>
            <input
              id="issue-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="issue-decimals">{s.issuerAdminIssueDecimals}</label>
            <input
              id="issue-decimals"
              type="number"
              min={0}
              max={18}
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="issue-supply-policy">
              {s.issuerAdminIssueSupplyPolicy}
            </label>
            <select
              id="issue-supply-policy"
              value={
                typeof supplyPolicy === 'object'
                  ? `capped:${supplyPolicy.cap}`
                  : supplyPolicy
              }
              onChange={(e) => setSupplyPolicy(e.target.value as SupplyPolicy)}
            >
              {SUPPLY_POLICIES.map((p) => {
                const pStr =
                  typeof p === 'object'
                    ? `capped:${(p as { kind: 'capped'; cap: bigint }).cap}`
                    : p;
                return (
                  <option key={pStr} value={pStr}>
                    {pStr}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label htmlFor="issue-transfer-policy">
              {s.issuerAdminIssueTransferPolicy}
            </label>
            <select
              id="issue-transfer-policy"
              value={transferPolicy}
              onChange={(e) =>
                setTransferPolicy(e.target.value as TransferPolicy)
              }
            >
              {TRANSFER_POLICIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={freezable}
                onChange={(e) => setFreezable(e.target.checked)}
              />{' '}
              {s.issuerAdminIssueFreezable}
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={burnable}
                onChange={(e) => setBurnable(e.target.checked)}
              />{' '}
              {s.issuerAdminIssueBurnable}
            </label>
          </div>
          <button type="submit">{s.issuerAdminIssueSubmit}</button>
        </form>
      </section>

      {/* ── Mint form ── */}
      <section
        className="brightledger-issuer-admin-panel__section"
        aria-label={s.issuerAdminMintTitle}
      >
        <h3>{s.issuerAdminMintTitle}</h3>
        <form onSubmit={handleMintSubmit} noValidate>
          <div>
            <label htmlFor="mint-asset">{s.issuerAdminMintLabelAsset}</label>
            <select
              id="mint-asset"
              value={mintAssetId}
              onChange={(e) => setMintAssetId(e.target.value)}
            >
              <option value="">{s.issuerAdminMintSelectAsset}</option>
              {Array.from(assets.entries()).map(([id, desc]) => (
                <option key={id} value={id}>
                  {desc.symbol} — {desc.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mint-recipient">
              {s.issuerAdminMintLabelRecipient}
            </label>
            <input
              id="mint-recipient"
              type="text"
              value={mintRecipient}
              onChange={(e) => setMintRecipient(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="mint-amount">{s.issuerAdminMintLabelAmount}</label>
            <input
              id="mint-amount"
              type="text"
              inputMode="decimal"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              required
            />
          </div>
          <button type="submit">{s.issuerAdminMintSubmit}</button>
        </form>
      </section>
    </div>
  );
}

export default IssuerAdminPanel;
