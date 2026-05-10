/**
 * WaitlistManager Component
 *
 * Displays a priority-sorted list of waitlisted patients with their
 * requested service, preferred provider, preferred dates, priority,
 * and wait time. Supports offering a slot to a patient and removing
 * entries from the waitlist.
 *
 * @module scheduling/WaitlistManager
 */
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import type { IWaitlistEntry } from '@brightchain/brightchart-lib';
import { BrightChartStrings } from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

export interface WaitlistManagerProps {
  /** Waitlist entries to display. */
  entries: IWaitlistEntry<string>[];
  /** Callback when "Offer Slot" is clicked for an entry. */
  onOfferSlot: (entryId: string) => void;
  /** Callback when "Remove" is clicked for an entry. */
  onRemove: (entryId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract display text from a CodeableConcept. */
function getServiceTypeDisplay(entry: IWaitlistEntry<string>): string {
  const st = entry.requestedServiceType;
  return st?.text ?? st?.coding?.[0]?.display ?? 'Unknown';
}

/** Extract preferred provider display name from a Reference. */
function getPreferredProvider(entry: IWaitlistEntry<string>): string {
  return entry.preferredPractitioner?.display ?? 'Any';
}

/** Format a preferred date range for display. */
function formatDateRange(
  entry: IWaitlistEntry<string>,
  formatDate: (date: Date | string) => string,
): string {
  const range = entry.preferredDateRange;
  if (!range) return 'Any';
  const parts: string[] = [];
  if (range.start) {
    const formatted = formatDate(range.start);
    parts.push(formatted || range.start);
  }
  if (range.end) {
    const formatted = formatDate(range.end);
    parts.push(formatted || range.end);
  }
  return parts.length === 2 ? `${parts[0]} – ${parts[1]}` : (parts[0] ?? 'Any');
}

/** Calculate human-readable wait time from createdAt to now. */
function getWaitTime(createdAt: Date): string {
  const now = new Date();
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  if (diffMs < 0) return '0m';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const WaitlistManager: React.FC<WaitlistManagerProps> = ({
  entries,
  onOfferSlot,
  onRemove,
}) => {
  const { t } = useBrightChartTranslation();
  const { formatDate } = useFormattedDate();

  // Sort by priority (lower = higher), then by createdAt (earlier first)
  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aTime = (
          a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
        ).getTime();
        const bTime = (
          b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
        ).getTime();
        return aTime - bTime;
      }),
    [entries],
  );

  const handleOfferSlot = useCallback(
    (entryId: string) => {
      onOfferSlot(entryId);
    },
    [onOfferSlot],
  );

  const handleRemove = useCallback(
    (entryId: string) => {
      onRemove(entryId);
    },
    [onRemove],
  );

  return (
    <div
      className="waitlist-manager"
      role="region"
      aria-label="Waitlist Manager"
    >
      {sortedEntries.length === 0 ? (
        <p className="waitlist-manager__empty" role="status">
          {t(BrightChartStrings.Empty_NoWaitlist)}
        </p>
      ) : (
        <table
          className="waitlist-manager__table"
          role="table"
          aria-label="Patient waitlist"
        >
          <thead>
            <tr>
              <th scope="col">{t(BrightChartStrings.Common_Patient)}</th>
              <th scope="col">{t(BrightChartStrings.Common_Service)}</th>
              <th scope="col">
                {t(BrightChartStrings.Waitlist_PreferredProvider)}
              </th>
              <th scope="col">
                {t(BrightChartStrings.Waitlist_PreferredDates)}
              </th>
              <th scope="col">{t(BrightChartStrings.Common_Priority)}</th>
              <th scope="col">{t(BrightChartStrings.Waitlist_WaitTime)}</th>
              <th scope="col">{t(BrightChartStrings.Common_Actions)}</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry) => (
              <tr key={entry.entryId} className="waitlist-manager__row">
                <td>{entry.patientId}</td>
                <td>{getServiceTypeDisplay(entry)}</td>
                <td>{getPreferredProvider(entry)}</td>
                <td>{formatDateRange(entry, formatDate)}</td>
                <td>{entry.priority}</td>
                <td>{getWaitTime(entry.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    className="waitlist-manager__btn waitlist-manager__btn--offer"
                    onClick={() => handleOfferSlot(entry.entryId)}
                    aria-label={`Offer slot to patient ${entry.patientId}`}
                  >
                    {t(BrightChartStrings.Common_OfferSlot)}
                  </button>
                  <button
                    type="button"
                    className="waitlist-manager__btn waitlist-manager__btn--remove"
                    onClick={() => handleRemove(entry.entryId)}
                    aria-label={`Remove patient ${entry.patientId} from waitlist`}
                  >
                    {t(BrightChartStrings.Common_Remove)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
