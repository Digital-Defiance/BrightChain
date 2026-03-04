/**
 * BrightPassProvider — React context managing vault state, auto-lock timers,
 * and decrypted data lifecycle.
 *
 * - Holds currently unlocked vault ID, metadata, and decrypted property records
 * - Master password hash kept in-memory only, cleared on lock
 * - Auto-lock after 15 minutes of inactivity (configurable)
 * - Accelerated 5-minute lock timer when browser tab becomes hidden
 * - Clears all decrypted data on lock, unmount, and tab visibility change
 *
 * Requirements: 4.10, 14.4
 */

import type {
  EntryPropertyRecord,
  IDecryptedVault,
  VaultMetadata,
} from '@brightchain/brightchain-lib';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useBrightPassApi } from '../hooks/useBrightPassApi';

/** Default inactivity timeout in milliseconds (15 minutes). */
const DEFAULT_AUTO_LOCK_MS = 15 * 60 * 1000;

/** Accelerated timeout when tab is hidden (5 minutes). */
const HIDDEN_TAB_LOCK_MS = 5 * 60 * 1000;

/** User-activity events that reset the inactivity timer. */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
];

export interface BrightPassVaultState {
  vaultId: string;
  metadata: VaultMetadata;
  propertyRecords: EntryPropertyRecord[];
}

export interface BrightPassContextValue {
  /** Currently unlocked vault state, or null when locked. */
  vault: BrightPassVaultState | null;
  /** Unlock a vault by ID and master password. */
  unlockVault: (vaultId: string, masterPassword: string) => Promise<void>;
  /** Lock the current vault and clear all decrypted data. */
  lockVault: () => void;
  /** Whether a vault is currently unlocked. */
  isVaultUnlocked: () => boolean;
  /** Auto-lock timeout in ms. */
  autoLockTimeout: number;
  /** Update the auto-lock timeout. */
  setAutoLockTimeout: (ms: number) => void;
}

const BrightPassContext = createContext<BrightPassContextValue | undefined>(
  undefined,
);

export interface BrightPassProviderProps {
  children: React.ReactNode;
  /** Override the default auto-lock timeout (ms). Defaults to 15 minutes. */
  initialAutoLockMs?: number;
}

export const BrightPassProvider: React.FC<BrightPassProviderProps> = ({
  children,
  initialAutoLockMs = DEFAULT_AUTO_LOCK_MS,
}) => {
  const [vault, setVault] = useState<BrightPassVaultState | null>(null);
  const [autoLockTimeout, setAutoLockTimeout] = useState(initialAutoLockMs);
  const brightPassApi = useBrightPassApi();

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vaultRef = useRef(vault);
  vaultRef.current = vault;

  // ── Core lock / unlock ──────────────────────────────────────────────

  const clearState = useCallback(() => {
    setVault(null);
  }, []);

  const lockVault = useCallback(() => {
    clearState();
  }, [clearState]);

  const unlockVault = useCallback(
    async (vaultId: string, masterPassword: string): Promise<void> => {
      const decrypted: IDecryptedVault<string> = await brightPassApi.openVault(
        vaultId,
        masterPassword,
      );

      // Build metadata from the decrypted response. The API returns a flat
      // IDecryptedVault<string>; we reconstruct VaultMetadata for consumers.
      const metadata: VaultMetadata = {
        id: decrypted.id,
        name: decrypted.name,
        ownerId: decrypted.ownerId,
        createdAt: new Date(decrypted.createdAt),
        updatedAt: new Date(decrypted.updatedAt),
        entryCount: decrypted.propertyRecords.length,
        sharedWith: [],
        vcblBlockId: '' as VaultMetadata['vcblBlockId'],
      };

      setVault({
        vaultId: decrypted.id,
        metadata,
        propertyRecords: decrypted.propertyRecords,
      });
    },
    [brightPassApi],
  );

  const isVaultUnlocked = useCallback((): boolean => {
    return vaultRef.current !== null;
  }, []);

  // ── Inactivity auto-lock timer ──────────────────────────────────────

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (vaultRef.current !== null) {
      inactivityTimerRef.current = setTimeout(() => {
        lockVault();
      }, autoLockTimeout);
    }
  }, [autoLockTimeout, clearInactivityTimer, lockVault]);

  // Start / restart inactivity timer whenever vault or timeout changes
  useEffect(() => {
    if (vault === null) {
      clearInactivityTimer();
      return;
    }

    resetInactivityTimer();

    const handler = () => resetInactivityTimer();
    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, handler, { passive: true });
    }

    return () => {
      clearInactivityTimer();
      for (const evt of ACTIVITY_EVENTS) {
        document.removeEventListener(evt, handler);
      }
    };
  }, [vault, autoLockTimeout, clearInactivityTimer, resetInactivityTimer]);

  // ── Tab visibility change — accelerated lock timer ──────────────────

  const clearHiddenTabTimer = useCallback(() => {
    if (hiddenTabTimerRef.current !== null) {
      clearTimeout(hiddenTabTimerRef.current);
      hiddenTabTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && vaultRef.current !== null) {
        // Start accelerated lock timer
        clearHiddenTabTimer();
        hiddenTabTimerRef.current = setTimeout(() => {
          lockVault();
        }, HIDDEN_TAB_LOCK_MS);
      } else if (document.visibilityState === 'visible') {
        // Tab came back — cancel the accelerated timer
        clearHiddenTabTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearHiddenTabTimer();
    };
  }, [clearHiddenTabTimer, lockVault]);

  // ── Cleanup on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      clearState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Context value ───────────────────────────────────────────────────

  const value: BrightPassContextValue = {
    vault,
    unlockVault,
    lockVault,
    isVaultUnlocked,
    autoLockTimeout,
    setAutoLockTimeout,
  };

  return (
    <BrightPassContext.Provider value={value}>
      {children}
    </BrightPassContext.Provider>
  );
};

/**
 * Hook to consume the BrightPass context. Must be used within a
 * `<BrightPassProvider>`.
 */
export function useBrightPass(): BrightPassContextValue {
  const ctx = useContext(BrightPassContext);
  if (ctx === undefined) {
    throw new Error('useBrightPass must be used within a BrightPassProvider');
  }
  return ctx;
}

export { BrightPassContext };

// Re-export constants for testing
export { DEFAULT_AUTO_LOCK_MS, HIDDEN_TAB_LOCK_MS };
