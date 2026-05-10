/**
 * useUserNames — Hook that batch-resolves user IDs to display names.
 *
 * Caches results in a module-level Map so lookups are shared across
 * components and don't re-fetch on every render.
 *
 * Requirements: 6.1, 6.4
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useChatApi } from './useChatApi';

/** Module-level cache shared across all hook instances. */
const nameCache = new Map<string, string>();

/** IDs currently being fetched (dedup in-flight requests). */
let pendingIds = new Set<string>();
let pendingPromise: Promise<void> | null = null;

/**
 * Given a set of user IDs, returns a Map<id, displayName>.
 * Fetches unknown IDs in a single batch call, caching results.
 */
export function useUserNames(ids: string[]): Map<string, string> {
  const chatApi = useChatApi();
  const [names, setNames] = useState<Map<string, string>>(() => {
    const initial = new Map<string, string>();
    for (const id of ids) {
      const cached = nameCache.get(id);
      if (cached) initial.set(id, cached);
    }
    return initial;
  });
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const resolve = useCallback(async () => {
    const missing = idsRef.current.filter(
      (id) => id && !nameCache.has(id) && !pendingIds.has(id),
    );
    if (missing.length === 0) {
      // All cached — just sync state
      setNames((prev) => {
        const next = new Map<string, string>();
        let changed = false;
        for (const id of idsRef.current) {
          const name = nameCache.get(id);
          if (name) {
            next.set(id, name);
            if (prev.get(id) !== name) changed = true;
          }
        }
        return changed || next.size !== prev.size ? next : prev;
      });
      return;
    }

    for (const id of missing) pendingIds.add(id);

    try {
      const result = await chatApi.batchLookupUsers(missing);
      for (const user of result.users ?? []) {
        nameCache.set(user.id, user.displayName);
      }
      // Mark IDs that weren't found so we don't re-fetch them
      for (const id of missing) {
        if (!nameCache.has(id)) {
          // Use truncated ID as fallback display name
          nameCache.set(id, id.length > 16 ? `${id.slice(0, 8)}…` : id);
        }
      }
    } catch {
      // On error, use truncated IDs as fallback
      for (const id of missing) {
        if (!nameCache.has(id)) {
          nameCache.set(id, id.length > 16 ? `${id.slice(0, 8)}…` : id);
        }
      }
    } finally {
      for (const id of missing) pendingIds.delete(id);
    }

    setNames(() => {
      const next = new Map<string, string>();
      for (const id of idsRef.current) {
        const name = nameCache.get(id);
        if (name) next.set(id, name);
      }
      return next;
    });
  }, [chatApi]);

  useEffect(() => {
    resolve();
  }, [resolve, ids.join(',')]);

  return names;
}

/** Get a display name for a single user ID, with truncated fallback. */
export function formatUserId(id: string): string {
  const cached = nameCache.get(id);
  if (cached) return cached;
  if (id.length > 16) return `${id.slice(0, 8)}…`;
  return id;
}
