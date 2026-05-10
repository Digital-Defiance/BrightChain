/**
 * @fileoverview AuditTrailView — displays an ordered list of ledger entries
 * with action kind, timestamp, and entry hash for audit purposes.
 *
 * @see Requirements 3.7, 6.1
 */

import type { ILedgerEntry } from '@brightchain/brightledger-assets-api-lib';
import { BrightLedgerStrings } from '../i18n/index.js';
import { abbreviateHex } from '../utils/index.js';

export interface AuditTrailViewProps {
  /**
   * Ordered ledger entries to display, oldest first.
   * The component is purely presentational — pagination is handled by the
   * caller via {@link onLoadMore}.
   */
  entries: ILedgerEntry[];
  /**
   * When provided, a "Load More" button is rendered at the bottom of the
   * list.  When clicked, this callback is invoked.
   */
  onLoadMore?: () => void;
}

/**
 * AuditTrailView renders a chronological audit trail of accepted ledger
 * entries.  Each row shows:
 * - sequence index (1-based, relative to the current page)
 * - action kind
 * - wall-clock timestamp (`context.now`)
 * - abbreviated entry hash derived from `context.derivedAssetId` when present
 *
 * If no entries are provided an empty-state message is shown.
 */
export function AuditTrailView({ entries, onLoadMore }: AuditTrailViewProps) {
  const s = BrightLedgerStrings;

  if (entries.length === 0) {
    return (
      <div className="brightledger-audit-trail brightledger-audit-trail--empty">
        <p>{s.auditTrailEmpty}</p>
      </div>
    );
  }

  return (
    <div className="brightledger-audit-trail">
      <h2 className="brightledger-audit-trail__title">{s.auditTrailTitle}</h2>
      <table className="brightledger-audit-trail__table">
        <thead>
          <tr>
            <th>{s.auditTrailColumnSequence}</th>
            <th>{s.auditTrailColumnKind}</th>
            <th>{s.auditTrailColumnTimestamp}</th>
            <th>{s.auditTrailColumnEntryHash}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const timestamp = new Date(entry.context.now).toISOString();
            const entryHash = entry.context.derivedAssetId
              ? abbreviateHex(entry.context.derivedAssetId)
              : '—';
            return (
              <tr
                key={idx}
                className="brightledger-audit-trail__row"
                data-action-kind={entry.action.kind}
              >
                <td>{idx + 1}</td>
                <td>{entry.action.kind}</td>
                <td>{timestamp}</td>
                <td
                  className="brightledger-audit-trail__entry-hash"
                  title={entry.context.derivedAssetId}
                >
                  {entryHash}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {onLoadMore && (
        <button
          className="brightledger-audit-trail__load-more"
          onClick={onLoadMore}
          type="button"
        >
          {s.auditTrailLoadMore}
        </button>
      )}
    </div>
  );
}

export default AuditTrailView;
