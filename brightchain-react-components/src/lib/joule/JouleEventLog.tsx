/**
 * @fileoverview JouleEventLog — paginated list of Joule ledger events.
 *
 * All bigint amounts are displayed via `formatJoule`.  The component accepts
 * the raw event list from `GET /api/me/joule/events` (which returns an empty
 * array in v1).
 *
 * @requirements joule-resource-credits spec, Req 7.3
 */

import { formatJoule, toBrightDateString } from '@brightchain/brightchain-lib';
import * as React from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface JouleEvent {
  id: string;
  kind: string;
  /** µJ amount (bigint). */
  microJoules: bigint;
  timestamp: number;
  description?: string;
}

export interface JouleEventLogProps {
  events: JouleEvent[];
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
 * Renders a list of Joule ledger events for the current member.
 *
 * Returns an empty-state message when `events` is empty.
 */
export const JouleEventLog: React.FC<JouleEventLogProps> = ({
  events,
  className,
  style,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <div
        className={`joule-event-log joule-event-log--loading${className ? ` ${className}` : ''}`}
        style={style}
        aria-busy="true"
        aria-label="Loading Joule events"
      >
        <div className="joule-event-log__skeleton" aria-hidden="true" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`joule-event-log joule-event-log--error${className ? ` ${className}` : ''}`}
        style={style}
        role="alert"
        aria-label="Joule event log error"
      >
        <span className="joule-event-log__error-message">{error}</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        className={`joule-event-log joule-event-log--empty${className ? ` ${className}` : ''}`}
        style={style}
        aria-label="Joule event log"
      >
        <p className="joule-event-log__empty-message">
          No Joule events recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`joule-event-log${className ? ` ${className}` : ''}`}
      style={style}
      aria-label="Joule event log"
    >
      <table className="joule-event-log__table" role="table">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Kind</th>
            <th scope="col">Amount</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td>{new Date(ev.timestamp).toLocaleString()} (BD {toBrightDateString(new Date(ev.timestamp), 3)})</td>
              <td>{ev.kind}</td>
              <td className="joule-event-log__amount">
                {formatJoule(ev.microJoules)}
              </td>
              <td>{ev.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default JouleEventLog;
