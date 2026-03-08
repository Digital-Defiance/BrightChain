/**
 * BrightMail shared context and UI types.
 *
 * Provides global state for sidebar, compose modal, and email selection
 * via React Context. The BrightMailProvider persists sidebar state to
 * sessionStorage so it survives route transitions (Requirement 1.8).
 */
import type { IconDefinition } from '@awesome.me/kit-a20d532681/icons';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Pre-fill data when opening the compose modal. */
export interface ComposePrefill {
  mode: 'new' | 'reply' | 'forward';
  to?: string[];
  subject?: string;
  body?: string;
  inReplyTo?: string;
}

/** Compose modal visibility / position state. */
export type ComposeModalState =
  | { status: 'closed' }
  | {
      status: 'open';
      prefill?: ComposePrefill;
      minimized: boolean;
      position: { x: number; y: number };
    };

/** A sidebar navigation entry. */
export interface NavItem {
  label: string;
  icon: IconDefinition;
  route: string;
  badge?: number;
}

/** Local star/favourite state (no backend persistence yet). */
export interface StarState {
  starredIds: Set<string>;
  toggle: (messageId: string) => void;
}

/** Shape of the value exposed by BrightMailContext. */
export interface BrightMailContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  composeModal: ComposeModalState;
  openCompose: (prefill?: ComposePrefill) => void;
  minimizeCompose: () => void;
  closeCompose: () => void;
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────

const BrightMailContext = createContext<BrightMailContextValue | null>(null);

// ─── SessionStorage helpers ─────────────────────────────────────────────────

const SIDEBAR_STORAGE_KEY = 'brightmail:sidebarOpen';

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

// ─── Default compose position ───────────────────────────────────────────────

const DEFAULT_COMPOSE_POSITION = { x: 0, y: 0 };

// ─── Provider ───────────────────────────────────────────────────────────────

export interface BrightMailProviderProps {
  children: ReactNode;
}

export const BrightMailProvider: FC<BrightMailProviderProps> = ({
  children,
}) => {
  // Sidebar state – initialised from sessionStorage
  const [sidebarOpen, setSidebarOpenRaw] = useState<boolean>(readSidebarState);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenRaw(open);
    writeSidebarState(open);
  }, []);

  // Compose modal state
  const [composeModal, setComposeModal] = useState<ComposeModalState>({
    status: 'closed',
  });

  const openCompose = useCallback((prefill?: ComposePrefill) => {
    setComposeModal({
      status: 'open',
      prefill,
      minimized: false,
      position: DEFAULT_COMPOSE_POSITION,
    });
  }, []);

  const minimizeCompose = useCallback(() => {
    setComposeModal((prev) => {
      if (prev.status !== 'open') return prev;
      return { ...prev, minimized: !prev.minimized };
    });
  }, []);

  const closeCompose = useCallback(() => {
    setComposeModal({ status: 'closed' });
  }, []);

  // Selected email (for reading pane)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const value = useMemo<BrightMailContextValue>(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      composeModal,
      openCompose,
      minimizeCompose,
      closeCompose,
      selectedEmailId,
      setSelectedEmailId,
    }),
    [
      sidebarOpen,
      setSidebarOpen,
      composeModal,
      openCompose,
      minimizeCompose,
      closeCompose,
      selectedEmailId,
    ],
  );

  return (
    <BrightMailContext.Provider value={value}>
      {children}
    </BrightMailContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * Consume the BrightMail context. Must be called inside a `<BrightMailProvider>`.
 */
export function useBrightMail(): BrightMailContextValue {
  const ctx = useContext(BrightMailContext);
  if (!ctx) {
    throw new Error('useBrightMail must be used within a BrightMailProvider');
  }
  return ctx;
}

export default BrightMailContext;
