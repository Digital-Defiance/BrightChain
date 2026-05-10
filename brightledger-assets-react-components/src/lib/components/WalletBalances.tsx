/**
 * @fileoverview WalletBalances — renders per-asset balances for a given account.
 *
 * @see Requirements 3.2, 3.3
 */

import type {
  IAssetDescriptor,
  IAssetProjectedState,
} from '@brightchain/brightledger-assets-api-lib';
import { useMemo } from 'react';
import { BrightLedgerStrings } from '../i18n/index.js';
import { formatBalance } from '../utils/index.js';

export interface WalletBalancesProps {
  /** Current projection of the ledger state. */
  state: IAssetProjectedState;
  /** Hex-encoded compressed public key of the account to display. */
  accountKey: string;
}

interface IBalanceRow {
  assetId: string;
  descriptor: IAssetDescriptor;
  rawBalance: bigint;
  formatted: string;
}

/**
 * WalletBalances renders a table of all assets for which `accountKey` holds a
 * non-zero balance.  If the account has no balances it shows an empty state.
 */
export function WalletBalances({ state, accountKey }: WalletBalancesProps) {
  const s = BrightLedgerStrings;

  const rows = useMemo<IBalanceRow[]>(() => {
    const result: IBalanceRow[] = [];
    for (const [assetId, descriptor] of state.assets) {
      const assetBalances = state.balances.get(assetId);
      const rawBalance = assetBalances?.get(accountKey) ?? 0n;
      if (rawBalance === 0n) continue;
      result.push({
        assetId,
        descriptor,
        rawBalance,
        formatted: formatBalance(rawBalance, descriptor.decimals),
      });
    }
    return result;
  }, [state, accountKey]);

  if (rows.length === 0) {
    return (
      <div className="brightledger-wallet-balances brightledger-wallet-balances--empty">
        <p>{s.walletBalancesEmpty}</p>
      </div>
    );
  }

  return (
    <div className="brightledger-wallet-balances">
      <h2 className="brightledger-wallet-balances__title">
        {s.walletBalancesTitle}
      </h2>
      <table className="brightledger-wallet-balances__table">
        <thead>
          <tr>
            <th>{s.walletBalancesColumnAsset}</th>
            <th>{s.walletBalancesColumnBalance}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.assetId}
              className="brightledger-wallet-balances__row"
              data-asset-id={row.assetId}
            >
              <td>{row.descriptor.symbol}</td>
              <td>{row.formatted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WalletBalances;
