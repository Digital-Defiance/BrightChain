/**
 * Pure utility functions for Heartbeat History Analytics.
 */

import { IStatusHistoryEntryDTO } from '../components/ProviderDetailView';

/**
 * Filter ledger entries by a case-insensitive substring query.
 *
 * An entry matches when the query appears as a substring (case-insensitive) in
 * any of: signalType, errorMessage, or httpStatusCode (converted to string).
 *
 * If the query is empty, all entries are returned.
 */
export function filterLedgerEntries(
  entries: IStatusHistoryEntryDTO[],
  query: string,
): IStatusHistoryEntryDTO[] {
  if (query === '') {
    return entries;
  }

  const lowerQuery = query.toLowerCase();

  return entries.filter((entry) => {
    if (entry.signalType.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    if (
      entry.errorMessage !== undefined &&
      entry.errorMessage.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    if (
      entry.httpStatusCode !== undefined &&
      String(entry.httpStatusCode).toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    return false;
  });
}
