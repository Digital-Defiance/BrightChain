/**
 * useBrightPassAutofill — React hook that accepts a site URL and returns
 * matching login entries with TOTP codes via the autofill endpoint.
 *
 * Also exports a pure `matchSiteUrl` helper for property testing (Property 19).
 *
 * Requirements: 13.1, 13.3
 */

import { useCallback, useEffect, useState } from 'react';
import type { IAutofillPayload } from '@brightchain/brightchain-lib';
import { useBrightPassApi } from './useBrightPassApi';

type AutofillEntry = IAutofillPayload<string>['entries'][number];

export interface UseBrightPassAutofillResult {
  entries: AutofillEntry[];
  loading: boolean;
  error: Error | null;
}

/**
 * Extract the hostname from a URL string, stripping protocol, port, and path.
 * Returns the lowercased hostname, or the original lowercased string if parsing
 * fails.
 */
function extractHostname(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0) return '';
  try {
    // If the URL has no protocol, prepend one so the URL constructor works.
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/**
 * Pure helper: returns `true` when `entryUrl` and `currentUrl` resolve to the
 * same hostname (ignoring protocol, port, and path).
 *
 * Exported for property-based testing (Property 19).
 */
export function matchSiteUrl(entryUrl: string, currentUrl: string): boolean {
  const entryHost = extractHostname(entryUrl);
  const currentHost = extractHostname(currentUrl);
  if (entryHost === '' || currentHost === '') return false;
  return entryHost === currentHost;
}

/**
 * React hook that fetches autofill entries for the given `siteUrl` from all
 * unlocked vaults via the BrightPass API.
 *
 * @param siteUrl - The URL of the site to match entries against.
 * @param vaultId - The ID of the vault to query for autofill entries.
 */
export function useBrightPassAutofill(
  siteUrl: string,
  vaultId: string,
): UseBrightPassAutofillResult {
  const [entries, setEntries] = useState<AutofillEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const brightPassApi = useBrightPassApi();

  const fetchEntries = useCallback(async () => {
    if (!siteUrl || !vaultId) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = await brightPassApi.getAutofill(vaultId, siteUrl);
      setEntries(payload.entries);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error(String((err as Record<string, unknown>).message ?? err)),
      );
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [siteUrl, vaultId]);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  return { entries, loading, error };
}
