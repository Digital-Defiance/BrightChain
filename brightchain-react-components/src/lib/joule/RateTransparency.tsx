/**
 * @fileoverview RateTransparency — displays the current Joule rate table.
 *
 * All µJ amounts are rendered via `formatJoule`.  This component is intentionally
 * neutral and informational; it never uses financial/investment vocabulary
 * (no "coin", "holder", "airdrop", "staking", etc.).
 *
 * @requirements joule-resource-credits spec, Req 7.4, 10.5
 */

import { formatJoule } from '@brightchain/brightchain-lib';
import * as React from 'react';
import { type JouleRateTableData } from './hooks';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RateTransparencyProps {
  rateTable: JouleRateTableData | null;
  /** CSS class applied to the outer wrapper. */
  className?: string;
  /** Optional style override. */
  style?: React.CSSProperties;
  /** Whether to show a loading skeleton. */
  loading?: boolean;
  /** Error message to display. */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays the active Joule rate table — version, effective date, and per-class
 * rates — with no financial speculation vocabulary.
 */
export const RateTransparency: React.FC<RateTransparencyProps> = ({
  rateTable,
  className,
  style,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div
        className={`rate-transparency rate-transparency--loading${className ? ` ${className}` : ''}`}
        style={style}
        aria-busy="true"
        aria-label="Loading rate table"
      >
        <div className="rate-transparency__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rate-transparency rate-transparency--error${className ? ` ${className}` : ''}`}
        style={style}
        role="alert"
        aria-label="Rate table error"
      >
        <span className="rate-transparency__error-message">{error}</span>
      </div>
    );
  }

  if (!rateTable) {
    return (
      <div
        className={`rate-transparency rate-transparency--empty${className ? ` ${className}` : ''}`}
        style={style}
        aria-label="Rate table unavailable"
      >
        <p className="rate-transparency__empty-message">
          Rate table not available.
        </p>
      </div>
    );
  }

  const effectiveDate = new Date(rateTable.effectiveAt);

  return (
    <div
      className={`rate-transparency${className ? ` ${className}` : ''}`}
      style={style}
      aria-label="Joule rate table"
    >
      <header className="rate-transparency__header">
        <h3 className="rate-transparency__title">
          Joule Rate Table — Version {rateTable.version}
        </h3>
        <p className="rate-transparency__meta">
          Effective: {effectiveDate.toLocaleString()}
          {rateTable.signedBy ? ` · Signed by: ${rateTable.signedBy}` : ''}
        </p>
      </header>
      <table className="rate-transparency__table" role="table">
        <thead>
          <tr>
            <th scope="col">Resource class</th>
            <th scope="col">Rate</th>
            <th scope="col">Per unit</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(rateTable.entries).map(([cls, entry]) => (
            <tr key={cls}>
              <td>{cls}</td>
              <td className="rate-transparency__amount">
                {formatJoule(entry.microJoulesPerUnit)}
              </td>
              <td>{entry.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RateTransparency;
