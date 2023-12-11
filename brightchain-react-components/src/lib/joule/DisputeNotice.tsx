/**
 * @fileoverview DisputeNotice — displays a Joule dispute with its lifecycle.
 *
 * States: DISPUTED → RESOLVED_FINAL → RESOLVED_REPLACED
 *
 * No member-side submission UI in v1.  This component is purely presentational.
 *
 * @requirements joule-resource-credits spec, Req 7.5, 8.1 – 8.4
 */

import { formatJoule } from '@brightchain/brightchain-lib';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Lifecycle state of a Joule dispute. */
export type DisputeState = 'DISPUTED' | 'RESOLVED_FINAL' | 'RESOLVED_REPLACED';

export interface JouleDispute {
  id: string;
  /** The disputed µJ amount (bigint). */
  microJoules: bigint;
  /** Current lifecycle state. */
  state: DisputeState;
  /** ISO timestamp of when the dispute was opened. */
  openedAt: number;
  /** ISO timestamp of resolution, if resolved. */
  resolvedAt?: number;
  /** Human-readable reason for the dispute. */
  reason?: string;
  /** Human-readable resolution note. */
  resolution?: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DisputeNoticeProps {
  dispute: JouleDispute;
  /** CSS class applied to the outer wrapper. */
  className?: string;
  /** Optional style override. */
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATE_LABELS: Record<DisputeState, string> = {
  DISPUTED: 'Under review',
  RESOLVED_FINAL: 'Resolved (final)',
  RESOLVED_REPLACED: 'Resolved (superseded)',
};

function stateClass(state: DisputeState): string {
  switch (state) {
    case 'DISPUTED':
      return 'joule-dispute--pending';
    case 'RESOLVED_FINAL':
      return 'joule-dispute--final';
    case 'RESOLVED_REPLACED':
      return 'joule-dispute--replaced';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays a single Joule dispute with its current lifecycle state.
 *
 * Amount is always formatted as a decimal string via `formatJoule`.
 */
export const DisputeNotice: React.FC<DisputeNoticeProps> = ({
  dispute,
  className,
  style,
}) => {
  const baseClass = `joule-dispute ${stateClass(dispute.state)}${className ? ` ${className}` : ''}`;

  return (
    <article
      className={baseClass}
      style={style}
      aria-label={`Joule dispute ${dispute.id}`}
    >
      <header className="joule-dispute__header">
        <span className="joule-dispute__id">Dispute #{dispute.id}</span>
        <span
          className={`joule-dispute__state joule-dispute__state--${dispute.state.toLowerCase()}`}
          aria-label="Dispute state"
        >
          {STATE_LABELS[dispute.state]}
        </span>
      </header>
      <dl className="joule-dispute__details">
        <div className="joule-dispute__row">
          <dt>Amount</dt>
          <dd className="joule-dispute__amount">
            {formatJoule(dispute.microJoules)}
          </dd>
        </div>
        <div className="joule-dispute__row">
          <dt>Opened</dt>
          <dd>{new Date(dispute.openedAt).toLocaleString()}</dd>
        </div>
        {dispute.reason ? (
          <div className="joule-dispute__row">
            <dt>Reason</dt>
            <dd>{dispute.reason}</dd>
          </div>
        ) : null}
        {dispute.resolvedAt ? (
          <div className="joule-dispute__row">
            <dt>Resolved</dt>
            <dd>{new Date(dispute.resolvedAt).toLocaleString()}</dd>
          </div>
        ) : null}
        {dispute.resolution ? (
          <div className="joule-dispute__row">
            <dt>Resolution</dt>
            <dd>{dispute.resolution}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
};

export default DisputeNotice;
