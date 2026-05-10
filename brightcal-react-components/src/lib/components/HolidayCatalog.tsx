import type { IHolidayFeedEntry } from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCalendarSubscription } from '../hooks/useCalendarSubscription';

/**
 * Props for the HolidayCatalog component.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export interface HolidayCatalogProps {
  /** Whether the catalog panel is open */
  isOpen: boolean;
  /** Callback to close the catalog */
  onClose: () => void;
  /** Set of ICS URLs the user is already subscribed to */
  subscribedCalendarUrls: Set<string>;
  /** API base URL */
  apiBaseUrl: string;
  /** Auth token for API requests */
  authToken?: string;
  /** Callback triggered after a successful subscription */
  onSubscribed: () => void;
}

/**
 * Filter holiday entries by a search query.
 * Returns only entries where displayName or region contains the query
 * as a case-insensitive substring.
 *
 * Exported for property testing.
 * Validates: Requirements 5.5
 */
export function filterHolidayEntries(
  entries: IHolidayFeedEntry[],
  query: string,
): IHolidayFeedEntry[] {
  if (!query) return entries;
  const lowerQuery = query.toLowerCase();
  return entries.filter(
    (entry) =>
      entry.displayName.toLowerCase().includes(lowerQuery) ||
      entry.region.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Determine the subscription status of a holiday entry.
 * Returns "subscribed" if the entry's icsUrl is in the subscribed set,
 * otherwise "available".
 *
 * Exported for property testing.
 * Validates: Requirements 5.4
 */
export function getSubscriptionStatus(
  icsUrl: string,
  subscribedUrls: Set<string>,
): 'subscribed' | 'available' {
  return subscribedUrls.has(icsUrl) ? 'subscribed' : 'available';
}

/**
 * Group holiday entries by region.
 * Returns a Map of region → entries in that region.
 */
function groupByRegion(
  entries: IHolidayFeedEntry[],
): Map<string, IHolidayFeedEntry[]> {
  const groups = new Map<string, IHolidayFeedEntry[]>();
  for (const entry of entries) {
    const region = entry.region || 'Other';
    const list = groups.get(region) ?? [];
    list.push(entry);
    groups.set(region, list);
  }
  return groups;
}

/**
 * HolidayCatalog displays a browsable list of holiday ICS feeds
 * grouped by region, with search/filter and one-click subscribe.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function HolidayCatalog({
  isOpen,
  onClose,
  subscribedCalendarUrls,
  apiBaseUrl,
  authToken,
  onSubscribed,
}: HolidayCatalogProps) {
  const { tBranded: t } = useI18n();
  const { subscribe, loading, error } = useCalendarSubscription({
    apiBaseUrl,
    authToken,
    onSuccess: onSubscribed,
  });

  const [entries, setEntries] = useState<IHolidayFeedEntry[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch holiday catalog entries when the panel opens
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      return;
    }

    let cancelled = false;

    async function fetchCatalog() {
      setFetchError(null);
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        };
        const res = await fetch(`${apiBaseUrl}/cal/holiday-catalog`, {
          headers,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: IHolidayFeedEntry[] = await res.json();
        if (!cancelled) setEntries(data);
      } catch (err) {
        if (!cancelled) {
          setFetchError(
            err instanceof Error
              ? err.message
              : t(BrightCalStrings.Holiday_UnableToLoad),
          );
        }
      }
    }

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, [isOpen, apiBaseUrl, authToken]);

  const filteredEntries = useMemo(
    () => filterHolidayEntries(entries, searchQuery),
    [entries, searchQuery],
  );

  const groupedEntries = useMemo(
    () => groupByRegion(filteredEntries),
    [filteredEntries],
  );

  const handleAdd = useCallback(
    async (entry: IHolidayFeedEntry) => {
      await subscribe(entry.icsUrl, entry.displayName);
    },
    [subscribe],
  );

  if (!isOpen) return null;

  const displayError = fetchError || error;

  return (
    <div
      className="brightcal-holiday-catalog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="brightcal-holiday-catalog"
        role="dialog"
        aria-label={t(BrightCalStrings.Label_HolidayCalendars)}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="brightcal-holiday-catalog-header">
          <h2>{t(BrightCalStrings.Label_HolidayCalendars)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(BrightCalStrings.Label_CloseHolidayCatalog)}
            className="brightcal-holiday-catalog-close"
          >
            ×
          </button>
        </div>

        {displayError && (
          <div className="brightcal-holiday-catalog-error" role="alert">
            {displayError}
          </div>
        )}

        <div className="brightcal-holiday-catalog-search">
          <input
            type="text"
            placeholder={t(BrightCalStrings.Holiday_SearchPlaceholder)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t(BrightCalStrings.Label_SearchHolidayCalendars)}
          />
        </div>

        <div className="brightcal-holiday-catalog-entries">
          {Array.from(groupedEntries.entries()).map(
            ([region, regionEntries]) => (
              <div key={region} className="brightcal-holiday-catalog-region">
                <h3>{region}</h3>
                <ul role="list" aria-label={`${region} holidays`}>
                  {regionEntries.map((entry) => {
                    const status = getSubscriptionStatus(
                      entry.icsUrl,
                      subscribedCalendarUrls,
                    );
                    return (
                      <li
                        key={entry.id}
                        className="brightcal-holiday-catalog-entry"
                      >
                        <div className="brightcal-holiday-catalog-entry-info">
                          <span className="brightcal-holiday-catalog-entry-name">
                            {entry.displayName}
                          </span>
                          <span className="brightcal-holiday-catalog-entry-desc">
                            {entry.description}
                          </span>
                        </div>
                        {status === 'subscribed' ? (
                          <span className="brightcal-holiday-catalog-badge">
                            {t(BrightCalStrings.Status_Subscribed)}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAdd(entry)}
                            disabled={loading}
                            aria-label={`${t(BrightCalStrings.Action_AddEvent)} ${entry.displayName}`}
                          >
                            {t(BrightCalStrings.Action_Create)}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          )}
          {groupedEntries.size === 0 && !displayError && (
            <p className="brightcal-holiday-catalog-empty">
              {t(BrightCalStrings.Holiday_NoCalendarsFound)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
