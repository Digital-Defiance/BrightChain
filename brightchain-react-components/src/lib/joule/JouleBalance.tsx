/**
 * @fileoverview JouleBalance — displays the member's current Joule balance.
 *
 * All amount props are bigint.  Formatting uses `formatJoule` from
 * `@brightchain/brightchain-lib` to produce human-readable strings that
 * never contain scientific notation and are always decimal.
 *
 * @requirements joule-resource-credits spec, Req 7.1
 */

import { formatJoule } from '@brightchain/brightchain-lib';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JouleBalanceProps {
  /** Available balance in µJ (bigint). */
  balance: bigint;
  /** Currently reserved (locked) µJ (bigint). */
  reserved: bigint;
  /** Total spent µJ all-time (bigint). */
  spent: bigint;
  /** CSS class applied to the outer wrapper. */
  className?: string;
  /** Optional style override. */
  style?: React.CSSProperties;
  /** Whether to show a loading skeleton. */
  loading?: boolean;
  /** Error message to display instead of balances. */
  error?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the member's Joule balance, reserved amount, and total spent.
 *
 * All values are passed as bigint and formatted to avoid scientific notation
 * or floating-point imprecision.
 */
export const JouleBalance: React.FC<JouleBalanceProps> = ({
  balance,
  reserved,
  spent,
  className,
  style,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div
        className={`joule-balance joule-balance--loading${className ? ` ${className}` : ''}`}
        style={style}
        aria-busy="true"
        aria-label="Loading Joule balance"
      >
        <div className="joule-balance__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`joule-balance joule-balance--error${className ? ` ${className}` : ''}`}
        style={style}
        role="alert"
        aria-label="Joule balance error"
      >
        <span className="joule-balance__error-message">{error}</span>
      </div>
    );
  }

  return (
    <div
      className={`joule-balance${className ? ` ${className}` : ''}`}
      style={style}
      aria-label="Joule balance"
    >
      <dl className="joule-balance__list">
        <div className="joule-balance__row">
          <dt className="joule-balance__label">Available</dt>
          <dd className="joule-balance__value joule-balance__value--available">
            {formatJoule(balance)}
          </dd>
        </div>
        <div className="joule-balance__row">
          <dt className="joule-balance__label">Reserved</dt>
          <dd className="joule-balance__value joule-balance__value--reserved">
            {formatJoule(reserved)}
          </dd>
        </div>
        <div className="joule-balance__row">
          <dt className="joule-balance__label">Spent</dt>
          <dd className="joule-balance__value joule-balance__value--spent">
            {formatJoule(spent)}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default JouleBalance;
