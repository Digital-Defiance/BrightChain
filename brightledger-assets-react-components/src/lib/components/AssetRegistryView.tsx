/**
 * @fileoverview AssetRegistryView — renders a table of all registered assets
 * in the Programmable Asset Ledger.
 *
 * @see Requirements 1.1, 1.7
 */

import type { IAssetDescriptor } from '@brightchain/brightledger-assets-api-lib';
import { BrightLedgerStrings } from '../i18n/index.js';

export interface AssetRegistryViewProps {
  /** All registered assets, keyed by hex asset ID. */
  assets: ReadonlyMap<string, IAssetDescriptor>;
  /**
   * Optional set of retired asset IDs (hex).
   * Retired entries are visually distinguished.
   */
  retiredAssets?: ReadonlySet<string>;
}

/**
 * AssetRegistryView renders a summary table of every asset in the ledger.
 *
 * It is a pure presentational component — no side effects, no data fetching.
 */
export function AssetRegistryView({
  assets,
  retiredAssets = new Set(),
}: AssetRegistryViewProps) {
  const s = BrightLedgerStrings;

  if (assets.size === 0) {
    return (
      <div className="brightledger-asset-registry brightledger-asset-registry--empty">
        <p>{s.assetRegistryEmpty}</p>
      </div>
    );
  }

  return (
    <div className="brightledger-asset-registry">
      <h2 className="brightledger-asset-registry__title">
        {s.assetRegistryTitle}
      </h2>
      <table className="brightledger-asset-registry__table">
        <thead>
          <tr>
            <th>{s.assetRegistryColumnSymbol}</th>
            <th>{s.assetRegistryColumnDisplayName}</th>
            <th>{s.assetRegistryColumnDecimals}</th>
            <th>{s.assetRegistryColumnSupplyPolicy}</th>
            <th>{s.assetRegistryColumnTransferPolicy}</th>
            <th>{s.assetRegistryColumnFreezable}</th>
            <th>{s.assetRegistryColumnBurnable}</th>
            <th>{s.assetRegistryColumnRetired}</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(assets.entries()).map(([assetId, descriptor]) => {
            const retired = retiredAssets.has(assetId);
            return (
              <tr
                key={assetId}
                className={
                  retired
                    ? 'brightledger-asset-registry__row brightledger-asset-registry__row--retired'
                    : 'brightledger-asset-registry__row'
                }
                data-asset-id={assetId}
              >
                <td>{descriptor.symbol}</td>
                <td>{descriptor.displayName}</td>
                <td>{descriptor.decimals}</td>
                <td>
                  {typeof descriptor.supplyPolicy === 'object'
                    ? `capped:${descriptor.supplyPolicy.cap}`
                    : descriptor.supplyPolicy}
                </td>
                <td>{descriptor.transferPolicy}</td>
                <td>
                  {descriptor.freezable
                    ? s.assetRegistryRetiredYes
                    : s.assetRegistryRetiredNo}
                </td>
                <td>
                  {descriptor.burnable
                    ? s.assetRegistryRetiredYes
                    : s.assetRegistryRetiredNo}
                </td>
                <td>
                  {retired
                    ? s.assetRegistryRetiredYes
                    : s.assetRegistryRetiredNo}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AssetRegistryView;
