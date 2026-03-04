/**
 * useBrightPassExtensionBridge — React hook exposing BrightPass capabilities
 * to a browser extension via `window.postMessage` and direct method calls.
 *
 * On mount:
 *   - Dispatches a `BRIGHTPASS_READY` CustomEvent on `window`
 *   - Registers a `message` listener that handles `BRIGHTPASS_AUTOFILL_REQUEST`
 *     messages after validating the sender's origin against a configurable
 *     allowlist.
 *
 * Also exports a pure `isAllowedOrigin` helper for property testing (Property 20).
 *
 * Requirements: 13.2, 13.4, 13.5, 13.6
 */

import type {
  EntryPropertyRecord,
  IBreachCheckResult,
  IGeneratedPassword,
  IPasswordGenerationOptions,
  VaultMetadata,
} from '@brightchain/brightchain-lib';
import { useCallback, useEffect, useMemo } from 'react';
import { useBrightPassApi } from './useBrightPassApi';

/** Default origin allowlist — empty by default (no origins allowed). */
const DEFAULT_ALLOWED_ORIGINS: string[] = [];

export interface UseBrightPassExtensionBridgeOptions {
  /** Origins permitted to send postMessage requests. Supports exact strings
   *  and simple wildcard patterns (e.g. `https://*.example.com`). */
  allowedOrigins?: string[];
}

export interface UseBrightPassExtensionBridgeResult {
  getVaults: () => Promise<VaultMetadata[]>;
  searchEntries: (
    vaultId: string,
    query: string,
  ) => Promise<EntryPropertyRecord[]>;
  generatePassword: (
    options: IPasswordGenerationOptions,
  ) => Promise<IGeneratedPassword>;
  checkBreach: (password: string) => Promise<IBreachCheckResult>;
}

/**
 * Pure helper: returns `true` when `origin` is present in the `allowlist`.
 *
 * Matching rules:
 *   - Exact string match (case-insensitive).
 *   - Wildcard pattern: a leading `*.` in the allowlist entry matches any
 *     subdomain. For example `https://*.example.com` matches
 *     `https://app.example.com` and `https://sub.app.example.com`.
 *
 * Exported for property-based testing (Property 20).
 */
export function isAllowedOrigin(origin: string, allowlist: string[]): boolean {
  const lowerOrigin = origin.toLowerCase();
  for (const entry of allowlist) {
    const lowerEntry = entry.toLowerCase();

    // Exact match
    if (lowerOrigin === lowerEntry) return true;

    // Wildcard pattern: entry contains `*`
    if (lowerEntry.includes('*')) {
      // Convert the wildcard pattern to a regex:
      //   - Escape regex-special chars except `*`
      //   - Replace `*` with `[^/]*` (match any chars except slash)
      const escaped = lowerEntry.replace(/([.+?^${}()|[\]\\])/g, '\\$1');
      const pattern = escaped.replace(/\*/g, '[^/]*');
      const re = new RegExp(`^${pattern}$`);
      if (re.test(lowerOrigin)) return true;
    }
  }
  return false;
}

/**
 * React hook that bridges BrightPass functionality to a browser extension.
 */
export function useBrightPassExtensionBridge(
  options: UseBrightPassExtensionBridgeOptions = {},
): UseBrightPassExtensionBridgeResult {
  const allowedOrigins = options.allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;
  const brightPassApi = useBrightPassApi();

  // ── Exposed methods ─────────────────────────────────────────────────

  const getVaults = useCallback(async (): Promise<VaultMetadata[]> => {
    return brightPassApi.listVaults();
  }, [brightPassApi]);

  const searchEntries = useCallback(
    async (vaultId: string, query: string): Promise<EntryPropertyRecord[]> => {
      return brightPassApi.searchEntries(vaultId, { text: query });
    },
    [brightPassApi],
  );

  const generatePassword = useCallback(
    async (opts: IPasswordGenerationOptions): Promise<IGeneratedPassword> => {
      return brightPassApi.generatePassword(opts);
    },
    [brightPassApi],
  );

  const checkBreach = useCallback(
    async (password: string): Promise<IBreachCheckResult> => {
      return brightPassApi.checkBreach(password);
    },
    [brightPassApi],
  );

  // Memoize the allowlist to keep the effect dependency stable when the
  // caller passes a literal array.
  const memoizedAllowlist = useMemo(
    () => allowedOrigins,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(allowedOrigins)],
  );

  // ── Lifecycle: BRIGHTPASS_READY + message listener ──────────────────

  useEffect(() => {
    // Signal to extensions that BrightPass is available.
    window.dispatchEvent(new CustomEvent('BRIGHTPASS_READY'));

    const handleMessage = async (event: MessageEvent) => {
      // Validate origin
      if (!isAllowedOrigin(event.origin, memoizedAllowlist)) return;

      const data = event.data as Record<string, unknown> | undefined;
      if (!data || data.type !== 'BRIGHTPASS_AUTOFILL_REQUEST') return;

      const siteUrl = data.siteUrl as string | undefined;
      const vaultId = data.vaultId as string | undefined;
      if (!siteUrl || !vaultId) return;

      try {
        const payload = await brightPassApi.getAutofill(vaultId, siteUrl);
        event.source?.postMessage(
          { type: 'BRIGHTPASS_AUTOFILL_RESPONSE', payload },
          { targetOrigin: event.origin },
        );
      } catch (err) {
        event.source?.postMessage(
          {
            type: 'BRIGHTPASS_AUTOFILL_ERROR',
            error: err instanceof Error ? err.message : String(err),
          },
          { targetOrigin: event.origin },
        );
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [memoizedAllowlist, brightPassApi]);

  return { getVaults, searchEntries, generatePassword, checkBreach };
}
