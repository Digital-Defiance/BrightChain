/**
 * BrightChat shared context and UI types.
 *
 * Provides global state for sidebar, compose area, active chat context,
 * presence, and server navigation via React Context. The BrightChatProvider
 * persists sidebar state, active server, and active channel to sessionStorage
 * so navigation state survives page refreshes (Requirements 2.2, 11.1–11.4).
 */
import {
  IChannel,
  IServerCategory,
  PresenceStatus,
} from '@brightchain/brightchain-lib';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChatApiClient } from './services/chatApi';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Identifies the currently active chat context. */
export interface ChatContext {
  type: 'conversation' | 'group' | 'channel';
  id: string;
}

/** Compose area visibility state. */
export type ComposeState = 'open' | 'minimized' | 'closed';

/** Shape of the value exposed by BrightChatContext. */
export interface BrightChatContextValue {
  activeChatContext: ChatContext | null;
  setActiveChatContext: (ctx: ChatContext | null) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  composeState: ComposeState;
  openCompose: () => void;
  minimizeCompose: () => void;
  closeCompose: () => void;

  presenceStatus: PresenceStatus;
  setPresenceStatus: (status: PresenceStatus) => void;

  // Server navigation state (Requirements 11.1, 11.2)
  activeServerId: string | null;
  setActiveServerId: (serverId: string | null) => void;

  // Cached server data (Requirement 11.2)
  serverChannels: IChannel[];
  serverCategories: IServerCategory[];
}

// ─── Context ────────────────────────────────────────────────────────────────

const BrightChatContext = createContext<BrightChatContextValue | null>(null);

// ─── SessionStorage helpers ─────────────────────────────────────────────────

const SIDEBAR_STORAGE_KEY = 'brightchat:sidebarOpen';
const ACTIVE_SERVER_STORAGE_KEY = 'brightchat:activeServerId';
const ACTIVE_CHANNEL_STORAGE_KEY = 'brightchat:activeChannelId';

function readSidebarState(): boolean {
  try {
    const stored = sessionStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true; // default open
  }
}

function writeSidebarState(open: boolean): void {
  try {
    sessionStorage.setItem(SIDEBAR_STORAGE_KEY, String(open));
  } catch {
    // storage unavailable – silently ignore
  }
}

/**
 * Read a string value from sessionStorage, returning null on missing key or error.
 */
export function readSessionStorageValue(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a string value to sessionStorage, or remove the key if value is null.
 */
export function writeSessionStorageValue(
  key: string,
  value: string | null,
): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
    }
  } catch {
    // storage unavailable – silently ignore
  }
}

/**
 * Determine whether a stored serverId should be restored based on the user's
 * current server membership list.
 *
 * Returns the storedServerId if it appears in memberServerIds, otherwise null.
 */
export function resolveRestoredServerId(
  storedServerId: string | null,
  memberServerIds: string[],
): string | null {
  if (storedServerId && memberServerIds.includes(storedServerId)) {
    return storedServerId;
  }
  return null;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export interface BrightChatProviderProps {
  children: ReactNode;
  /** Optional chatApi client for server data fetching. When omitted, server
   *  channel/category fetching is skipped (useful in tests). */
  chatApi?: ChatApiClient;
}

export const BrightChatProvider: FC<BrightChatProviderProps> = ({
  children,
  chatApi,
}) => {
  // Active chat context
  const [activeChatContext, setActiveChatContextRaw] =
    useState<ChatContext | null>(null);

  const setActiveChatContext = useCallback((ctx: ChatContext | null) => {
    setActiveChatContextRaw(ctx);
  }, []);

  // Sidebar state – initialised from sessionStorage
  const [sidebarOpen, setSidebarOpenRaw] = useState<boolean>(readSidebarState);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenRaw(open);
    writeSidebarState(open);
  }, []);

  // Compose area state
  const [composeState, setComposeState] = useState<ComposeState>('closed');

  const openCompose = useCallback(() => {
    setComposeState('open');
  }, []);

  const minimizeCompose = useCallback(() => {
    setComposeState('minimized');
  }, []);

  const closeCompose = useCallback(() => {
    setComposeState('closed');
  }, []);

  // Presence status
  const [presenceStatus, setPresenceStatusRaw] = useState<PresenceStatus>(
    PresenceStatus.ONLINE,
  );

  const setPresenceStatus = useCallback((status: PresenceStatus) => {
    setPresenceStatusRaw(status);
  }, []);

  // ─── Server navigation state (Requirements 11.1–11.4) ──────────────

  const [activeServerId, setActiveServerIdRaw] = useState<string | null>(null);
  const [serverChannels, setServerChannels] = useState<IChannel[]>([]);
  const [serverCategories, setServerCategories] = useState<IServerCategory[]>(
    [],
  );

  // Track whether mount restoration has run so we don't double-fetch
  const mountRestoredRef = useRef(false);

  const setActiveServerId = useCallback((serverId: string | null) => {
    setActiveServerIdRaw(serverId);
    writeSessionStorageValue(ACTIVE_SERVER_STORAGE_KEY, serverId);

    // Clear channel selection when switching servers
    if (serverId === null) {
      writeSessionStorageValue(ACTIVE_CHANNEL_STORAGE_KEY, null);
    }
  }, []);

  // Fetch server channels/categories when activeServerId changes
  useEffect(() => {
    if (!activeServerId || !chatApi) {
      setServerChannels([]);
      setServerCategories([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const server = await chatApi.getServer(activeServerId);
        if (!cancelled) {
          // Build channel list from the server's channelIds
          // The server response includes categories with channelIds
          setServerCategories(server.categories ?? []);

          // Fetch individual channels for the server
          // The server object has channelIds; we need the full channel objects
          const channelPromises = (server.channelIds ?? []).map((id: string) =>
            chatApi.getChannel(id).catch(() => null),
          );
          const channels = (await Promise.all(channelPromises)).filter(
            (ch): ch is IChannel => ch !== null,
          );
          if (!cancelled) {
            setServerChannels(channels);
          }
        }
      } catch {
        // Server fetch failed – clear cached data
        if (!cancelled) {
          setServerChannels([]);
          setServerCategories([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeServerId, chatApi]);

  // Restore navigation state from sessionStorage on mount (Requirement 11.4)
  useEffect(() => {
    if (mountRestoredRef.current || !chatApi) return;
    mountRestoredRef.current = true;

    const storedServerId = readSessionStorageValue(ACTIVE_SERVER_STORAGE_KEY);
    if (!storedServerId) return;

    (async () => {
      try {
        const result = await chatApi.listServers();
        const memberServerIds = (result.items ?? []).map(
          (s: { id: string }) => s.id,
        );
        const resolved = resolveRestoredServerId(
          storedServerId,
          memberServerIds,
        );
        if (resolved) {
          setActiveServerIdRaw(resolved);
        } else {
          // User is no longer a member – clear stored values
          writeSessionStorageValue(ACTIVE_SERVER_STORAGE_KEY, null);
          writeSessionStorageValue(ACTIVE_CHANNEL_STORAGE_KEY, null);
        }
      } catch {
        // Network error on restore – leave at null (Home view)
      }
    })();
  }, [chatApi]);

  const value = useMemo<BrightChatContextValue>(
    () => ({
      activeChatContext,
      setActiveChatContext,
      sidebarOpen,
      setSidebarOpen,
      composeState,
      openCompose,
      minimizeCompose,
      closeCompose,
      presenceStatus,
      setPresenceStatus,
      activeServerId,
      setActiveServerId,
      serverChannels,
      serverCategories,
    }),
    [
      activeChatContext,
      setActiveChatContext,
      sidebarOpen,
      setSidebarOpen,
      composeState,
      openCompose,
      minimizeCompose,
      closeCompose,
      presenceStatus,
      setPresenceStatus,
      activeServerId,
      setActiveServerId,
      serverChannels,
      serverCategories,
    ],
  );

  return (
    <BrightChatContext.Provider value={value}>
      {children}
    </BrightChatContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Consume the BrightChat context. Must be called inside a `<BrightChatProvider>`.
 */
export function useBrightChat(): BrightChatContextValue {
  const ctx = useContext(BrightChatContext);
  if (!ctx) {
    throw new Error('useBrightChat must be used within a BrightChatProvider');
  }
  return ctx;
}

export default BrightChatContext;
