/**
 * @fileoverview TransferComposer — form for composing asset transfer requests.
 *
 * Because the underlying `ITransferAction` carries Uint8Array / bigint fields
 * that require cryptographic context to populate, this component exposes a
 * simpler `ITransferFormData` shape.  Callers are responsible for signing and
 * broadcasting the final action.
 *
 * @see Requirements 3.1, 3.3
 */

import type { IAssetDescriptor } from '@brightchain/brightledger-assets-api-lib';
import React, { useState } from 'react';
import { BrightLedgerStrings } from '../i18n/index.js';

// ── Public types ──────────────────────────────────────────────────────────────

/** Validated form data emitted by {@link TransferComposer} on submission. */
export interface ITransferFormData {
  /** Hex string of the selected asset ID. */
  readonly assetId: string;
  /** Display symbol of the selected asset (for user confirmation). */
  readonly assetSymbol: string;
  /**
   * Amount as a decimal string (e.g. `"1.5"`).
   * The caller must convert this to the appropriate bigint µ-unit value
   * using the asset's `decimals` field.
   */
  readonly amount: string;
  /** Hex-encoded recipient account public key. */
  readonly recipient: string;
  /** Optional memo text (≤ 256 characters). */
  readonly memo: string;
}

export interface TransferComposerProps {
  /** All registered assets, keyed by hex asset ID. */
  assets: ReadonlyMap<string, IAssetDescriptor>;
  /** Called when the user submits a valid transfer form. */
  onSubmit: (formData: ITransferFormData) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * TransferComposer renders a controlled form that lets a user compose an
 * asset transfer.  Validation is performed on submit; per-field errors are
 * displayed inline.
 */
export function TransferComposer({ assets, onSubmit }: TransferComposerProps) {
  const s = BrightLedgerStrings;

  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');
  const [errors, setErrors] = useState<
    Partial<Record<'assetId' | 'amount' | 'recipient', string>>
  >({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextErrors: typeof errors = {};

    if (!selectedAssetId) {
      nextErrors.assetId = s.transferComposerValidationAsset;
    }
    const trimmedAmount = amount.trim();
    if (
      !trimmedAmount ||
      !/^\d+(\.\d+)?$/.test(trimmedAmount) ||
      Number(trimmedAmount) <= 0
    ) {
      nextErrors.amount = s.transferComposerValidationAmount;
    }
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) {
      nextErrors.recipient = s.transferComposerValidationRecipient;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const descriptor = assets.get(selectedAssetId);
    onSubmit({
      assetId: selectedAssetId,
      assetSymbol: descriptor?.symbol ?? selectedAssetId,
      amount: trimmedAmount,
      recipient: trimmedRecipient,
      memo: memo.trim(),
    });
  }

  return (
    <div className="brightledger-transfer-composer">
      <h2 className="brightledger-transfer-composer__title">
        {s.transferComposerTitle}
      </h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="brightledger-transfer-composer__field">
          <label htmlFor="transfer-asset">{s.transferComposerLabelAsset}</label>
          <select
            id="transfer-asset"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
          >
            <option value="">{s.transferComposerSelectAsset}</option>
            {Array.from(assets.entries()).map(([id, desc]) => (
              <option key={id} value={id}>
                {desc.symbol} — {desc.displayName}
              </option>
            ))}
          </select>
          {errors.assetId && (
            <span
              className="brightledger-transfer-composer__error"
              role="alert"
            >
              {errors.assetId}
            </span>
          )}
        </div>

        <div className="brightledger-transfer-composer__field">
          <label htmlFor="transfer-recipient">
            {s.transferComposerLabelRecipient}
          </label>
          <input
            id="transfer-recipient"
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          {errors.recipient && (
            <span
              className="brightledger-transfer-composer__error"
              role="alert"
            >
              {errors.recipient}
            </span>
          )}
        </div>

        <div className="brightledger-transfer-composer__field">
          <label htmlFor="transfer-amount">
            {s.transferComposerLabelAmount}
          </label>
          <input
            id="transfer-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {errors.amount && (
            <span
              className="brightledger-transfer-composer__error"
              role="alert"
            >
              {errors.amount}
            </span>
          )}
        </div>

        <div className="brightledger-transfer-composer__field">
          <label htmlFor="transfer-memo">{s.transferComposerLabelMemo}</label>
          <input
            id="transfer-memo"
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <button type="submit">{s.transferComposerSubmit}</button>
      </form>
    </div>
  );
}

export default TransferComposer;
