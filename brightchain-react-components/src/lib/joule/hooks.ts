/**
 * @fileoverview Joule React hooks — data fetching for Joule resource credits.
 *
 * All amount values are kept as bigint throughout; formatting is done via
 * `formatJoule` from `@brightchain/brightchain-lib`.
 *
 * @requirements joule-resource-credits spec, Req 7.1 – 7.5
 */

import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JouleBalanceData {
  balance: bigint;
  reserved: bigint;
  spent: bigint;
}

export interface JouleConsumptionData {
  consumed: bigint;
  windowMs: number;
}

export interface JouleRateEntry {
  microJoulesPerUnit: bigint;
  unit: string;
}

export interface JouleRateTableData {
  version: number;
  effectiveAt: number;
  entries: Record<string, JouleRateEntry>;
  signedBy?: string;
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseJouleBalanceResult {
  data: JouleBalanceData | null;
  status: FetchStatus;
  error: string | null;
  refetch: () => void;
}

export interface UseJouleConsumptionResult {
  data: JouleConsumptionData | null;
  status: FetchStatus;
  error: string | null;
  refetch: () => void;
}

export interface UseRateTableResult {
  data: JouleRateTableData | null;
  status: FetchStatus;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a JSON response that may contain bigint values encoded as decimal strings. */
function parseBigIntFields<T>(
  obj: Record<string, unknown>,
  fields: (keyof T)[],
): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    const key = field as string;
    if (typeof result[key] === 'string') {
      result[key] = BigInt(result[key] as string);
    } else if (typeof result[key] === 'number') {
      result[key] = BigInt(Math.trunc(result[key] as number));
    }
  }
  return result as unknown as T;
}

// ---------------------------------------------------------------------------
// useJouleBalance
// ---------------------------------------------------------------------------

/**
 * Fetches the current user's Joule balance from `GET /api/me/joule/balance`.
 * All amounts are bigint.
 */
export function useJouleBalance(apiBase = '/api'): UseJouleBalanceResult {
  const [data, setData] = useState<JouleBalanceData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`${apiBase}/me/joule/balance`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Record<string, unknown>>;
      })
      .then((json) => {
        if (cancelled) return;
        const parsed = parseBigIntFields<JouleBalanceData>(
          json as Record<string, unknown>,
          ['balance', 'reserved', 'spent'],
        );
        setData(parsed);
        setStatus('success');
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, tick]);

  return { data, status, error, refetch };
}

// ---------------------------------------------------------------------------
// useJouleConsumption
// ---------------------------------------------------------------------------

/**
 * Fetches the current user's Joule consumption for the given time window.
 * `windowMs` defaults to 24 hours.
 */
export function useJouleConsumption(
  windowMs = 24 * 60 * 60 * 1_000,
  apiBase = '/api',
): UseJouleConsumptionResult {
  const [data, setData] = useState<JouleConsumptionData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`${apiBase}/me/joule/consumption?window=${windowMs}`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Record<string, unknown>>;
      })
      .then((json) => {
        if (cancelled) return;
        const parsed = parseBigIntFields<JouleConsumptionData>(
          json as Record<string, unknown>,
          ['consumed'],
        );
        setData({ ...parsed, windowMs });
        setStatus('success');
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, windowMs, tick]);

  return { data, status, error, refetch };
}

// ---------------------------------------------------------------------------
// useRateTable
// ---------------------------------------------------------------------------

/**
 * Fetches the current Joule rate table from `GET /api/joule/rate-table`.
 * microJoulesPerUnit fields inside entries are kept as bigint.
 */
export function useRateTable(apiBase = '/api'): UseRateTableResult {
  const [data, setData] = useState<JouleRateTableData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`${apiBase}/joule/rate-table`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Record<string, unknown>>;
      })
      .then((json) => {
        if (cancelled) return;
        const raw = json as Record<string, unknown>;
        // Parse bigint inside entries
        const entries = (raw['entries'] ?? {}) as Record<
          string,
          Record<string, unknown>
        >;
        const parsedEntries: Record<string, JouleRateEntry> = {};
        for (const [cls, entry] of Object.entries(entries)) {
          const mj = entry['microJoulesPerUnit'];
          parsedEntries[cls] = {
            microJoulesPerUnit:
              typeof mj === 'string'
                ? BigInt(mj)
                : typeof mj === 'number'
                  ? BigInt(Math.trunc(mj))
                  : 0n,
            unit: typeof entry['unit'] === 'string' ? entry['unit'] : cls,
          };
        }
        setData({
          version: typeof raw['version'] === 'number' ? raw['version'] : 0,
          effectiveAt:
            typeof raw['effectiveAt'] === 'number' ? raw['effectiveAt'] : 0,
          entries: parsedEntries,
          signedBy:
            typeof raw['signedBy'] === 'string' ? raw['signedBy'] : undefined,
        });
        setStatus('success');
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, tick]);

  return { data, status, error, refetch };
}
