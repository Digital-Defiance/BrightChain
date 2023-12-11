/**
 * @fileoverview JouleConsumptionChart — displays per-resource-class consumption.
 *
 * All amount props are bigint.  Formatting uses `formatJoule`.
 * In v1 this is a simple tabular display; a chart library integration is
 * Phase 5.
 *
 * @requirements joule-resource-credits spec, Req 7.2
 */

import { formatJoule } from '@brightchain/brightchain-lib';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JouleConsumptionEntry {
  /** Resource class label (compute, storage, network, proofOfWork). */
  resourceClass: string;
  /** Consumed µJ for this class (bigint). */
  consumed: bigint;
}

export interface JouleConsumptionChartProps {
  /** Consumption data per resource class. */
  entries: JouleConsumptionEntry[];
  /** Total consumed µJ in the window (bigint). */
  totalConsumed: bigint;
  /** Window size in ms. */
  windowMs: number;
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
 * Displays a per-resource-class breakdown of Joule consumption.
 *
 * All amounts are bigint. The component never produces NaN, Infinity, or
 * scientific notation regardless of the magnitude of input.
 */
export const JouleConsumptionChart: React.FC<JouleConsumptionChartProps> = ({
  entries,
  totalConsumed,
  windowMs,
  className,
  style,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div
        className={`joule-consumption joule-consumption--loading${className ? ` ${className}` : ''}`}
        style={style}
        aria-busy="true"
        aria-label="Loading Joule consumption"
      >
        <div className="joule-consumption__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`joule-consumption joule-consumption--error${className ? ` ${className}` : ''}`}
        style={style}
        role="alert"
        aria-label="Joule consumption error"
      >
        <span className="joule-consumption__error-message">{error}</span>
      </div>
    );
  }

  const windowLabel =
    windowMs >= 86_400_000
      ? `${windowMs / 86_400_000}d`
      : windowMs >= 3_600_000
        ? `${windowMs / 3_600_000}h`
        : `${windowMs / 60_000}m`;

  return (
    <div
      className={`joule-consumption${className ? ` ${className}` : ''}`}
      style={style}
      aria-label={`Joule consumption over ${windowLabel}`}
    >
      <p className="joule-consumption__summary">
        Total consumed in {windowLabel}:{' '}
        <strong>{formatJoule(totalConsumed)}</strong>
      </p>
      {entries.length === 0 ? (
        <p className="joule-consumption__empty">No consumption data.</p>
      ) : (
        <table className="joule-consumption__table" role="table">
          <thead>
            <tr>
              <th scope="col">Resource class</th>
              <th scope="col">Consumed</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.resourceClass}>
                <td>{entry.resourceClass}</td>
                <td className="joule-consumption__amount">
                  {formatJoule(entry.consumed)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JouleConsumptionChart;
